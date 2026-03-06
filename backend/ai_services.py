import os
from google import genai
from dotenv import load_dotenv

# Load backend/.env reliably
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

#Initialize GenAI client
gemini_client = genai.Client(api_key=os.getenv("GENAI_API_KEY"))

def get_gemini_response(prompt: str) -> str:
    """
    Get a response from the Gemini API for a given prompt.
    
    Args:
        prompt (str): The input prompt to send to the Gemini API.
    """
    system_instruction = (
        "You are a helpful assistant for Sigmas Hub website."
        "Sigmas Hub is a social media app for sharing and discovering content."
        "When a user is creating a post, they can send you their bio, and you will send up to 5 tags that are relevant to the content of their bio." 
        "The tags should be concise and relevant to the content of the bio."
        "If the bio is about a specific topic, you can include tags related to that topic. If the bio is more general, you can include more general tags."
        "Please provide the tags in a comma-separated format without any additional text or explanations."
        "e.g: If the bio is 'I love cooking and sharing recipes', you might respond with 'cooking, recipes, food, culinary, chef'."
        
        )
    
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                {"role": "system", "text": system_instruction},
                {"role": "user", "text": prompt}
            ],
        )
        return response.text
    except Exception as e:
        print(f"Error getting response from Gemini API: {e}")
        return "Error generating tags"
    