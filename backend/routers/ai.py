import os
from google import genai
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

gemini_client = genai.Client(api_key=os.getenv("GENAI_API_KEY"))

router = APIRouter()


class GeminiRequest(BaseModel):
    prompt: str
    existing_tags: list[str] = []


def get_gemini_response(prompt: str, existing_tags: list = []) -> str:
    system_instruction = (
        "You are a helpful assistant for Sigmas Hub website."
        "Sigmas Hub is a social media app for sharing and discovering content."
        "When a user is creating a post, they can send you their bio, and you will send up to 5 tags that are relevant to the content of their bio."
        "The tags should be concise and relevant to the content of the bio."
        "If the bio is about a specific topic, you can include tags related to that topic. If the bio is more general, you can include more general tags."
        "Please provide the tags in a comma-separated format without any additional text or explanations."
        "e.g: If the bio is 'I love cooking and sharing recipes', you might respond with 'cooking, recipes, food, culinary, chef'."
    )

    existing_tags_note = ""
    if existing_tags:
        existing_tags_note = f"\nThe user already has these tags, do NOT suggest them again: {', '.join(existing_tags)}"

    try:
        print("prompt: ", prompt)
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_instruction}{existing_tags_note}\nUser Bio: {prompt}\nTags:",
        )
        print(f"Gemini API response: {response}")
        print(response.text)
        return response.text.strip()
    except Exception as e:
        print(f"Error getting response from Gemini API: {e}")
        return "Error generating tags"


@router.post("/ask_ai")
def ask_ai(data: GeminiRequest):
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    try:
        response = get_gemini_response(prompt, data.existing_tags)
        return {"ok": True, "response": response}
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI service")
