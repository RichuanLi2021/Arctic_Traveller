from __future__ import annotations

import os
from typing import Dict, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from .ice_extent import scan_available_dates

def generate_chat_reply(message: str) -> Dict[str, Optional[str]]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or "your-api-key" in api_key:
        return {
            "reply": "I am not connected to an LLM yet. Please set the GOOGLE_API_KEY environment variable.",
            "note": "Missing GOOGLE_API_KEY"
        }

    # Gather context
    try:
        dates = scan_available_dates()
        count = len(dates)
        date_range = f"{dates[0]} to {dates[-1]}" if dates else "No data available"
        context_str = (
            f"Dataset Context: There are {count} valid sea ice extent snapshots available. "
            f"The date range is {date_range}."
        )
    except Exception:
        context_str = "Dataset Context: Unable to retrieve dataset statistics at this time."

    try:
        model = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.7
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an intelligent assistant for a NASA Sea Ice Analysis application. "
                       "Your goal is to help users understand sea ice extent data. "
                       "{context}. "
                       "Answer concise and helpful."),
            ("human", "{question}")
        ])

        chain = prompt | model | StrOutputParser()
        
        reply_text = chain.invoke({
            "context": context_str,
            "question": message
        })

        return {"reply": reply_text, "note": None}
    except Exception as e:
        return {
            "reply": "I encountered an error calling the Gemini model.",
            "note": f"Error: {str(e)}. Check your API key and model availability."
        }
