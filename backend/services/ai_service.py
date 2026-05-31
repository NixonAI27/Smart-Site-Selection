import json
import os
from typing import Any

import anthropic

BASE_ANALYSIS_MODEL = "claude-opus-4-8"
RAG_PRICING_MODEL = "claude-sonnet-4-6"

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def get_active_model(db) -> str:
    """Return fine-tuned model ID if one is activated, else base model."""
    from models.fine_tuning_job import AppSettings
    settings = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if settings and settings.fine_tuned_model_id:
        return settings.fine_tuned_model_id
    return BASE_ANALYSIS_MODEL


CARPENTRY_SYSTEM = """You are an expert finish carpentry estimator with 20+ years of experience.
You analyze architectural drawings, specifications, and project notes to extract detailed scope of work
and quantities for finish carpentry trades including: baseboards, crown moulding, door/window casing,
wainscoting, built-in cabinetry, millwork, stair components, and hardware.
Always respond with precise, structured data suitable for cost estimating."""


def analyze_document(parsed: dict[str, Any], db=None) -> dict:
    """Send parsed document content to Claude and extract carpentry scope."""
    client = _get_client()
    model = get_active_model(db) if db else BASE_ANALYSIS_MODEL

    content = []

    # attach images first (if any)
    for img_block in parsed.get("images", []):
        content.append(img_block)

    # then text
    if parsed.get("text"):
        content.append({
            "type": "text",
            "text": f"Document content:\n\n{parsed['text'][:30000]}",
        })

    if not content:
        return {"rooms": [], "scope_items": [], "materials": [], "notes": ["No extractable content found."]}

    tools = [{
        "name": "extract_carpentry_scope",
        "description": "Extract finish carpentry scope, rooms, and quantities from the document.",
        "input_schema": {
            "type": "object",
            "properties": {
                "rooms": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "width_ft": {"type": "number"},
                            "length_ft": {"type": "number"},
                            "ceiling_height_ft": {"type": "number"},
                        },
                        "required": ["name"],
                    },
                },
                "scope_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string", "enum": ["trim", "millwork", "cabinetry", "hardware", "labor", "other"]},
                            "description": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unit": {"type": "string"},
                        },
                        "required": ["category", "description", "quantity", "unit"],
                    },
                },
                "materials": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "notes": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["rooms", "scope_items", "materials", "notes"],
        },
    }]

    response = client.messages.create(
        model=model,
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": CARPENTRY_SYSTEM,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=tools,
        tool_choice={"type": "tool", "name": "extract_carpentry_scope"},
        messages=[{"role": "user", "content": content}],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "extract_carpentry_scope":
            return block.input

    return {"rooms": [], "scope_items": [], "materials": [], "notes": []}


def suggest_pricing(scope_items: list[dict], rag_context: list[dict]) -> list[dict]:
    """Use RAG context from past estimates to suggest unit costs for scope items."""
    client = _get_client()

    context_text = ""
    if rag_context:
        context_text = "Similar past carpentry estimates for reference:\n\n"
        for i, doc in enumerate(rag_context, 1):
            context_text += f"--- Past Estimate {i} ---\n{doc['text'][:2000]}\n\n"

    tools = [{
        "name": "suggest_unit_costs",
        "description": "Suggest unit costs for each scope item based on past estimates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "suggested_unit_cost": {"type": "number"},
                            "unit": {"type": "string"},
                            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                            "basis": {"type": "string"},
                        },
                        "required": ["description", "suggested_unit_cost", "unit", "confidence"],
                    },
                }
            },
            "required": ["suggestions"],
        },
    }]

    items_text = json.dumps(scope_items, indent=2)
    user_content = f"{context_text}\nPlease suggest unit costs for these line items:\n{items_text}"

    response = client.messages.create(
        model=RAG_PRICING_MODEL,
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": CARPENTRY_SYSTEM,
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": context_text,
                "cache_control": {"type": "ephemeral"},
            },
        ],
        tools=tools,
        tool_choice={"type": "tool", "name": "suggest_unit_costs"},
        messages=[{"role": "user", "content": f"Suggest unit costs for these line items:\n{items_text}"}],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "suggest_unit_costs":
            return block.input.get("suggestions", [])

    return []
