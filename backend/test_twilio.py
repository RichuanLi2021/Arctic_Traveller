#!/usr/bin/env python3
"""
Simple test script to verify Twilio SMS functionality
Run this to test your Twilio configuration before starting the full SMS service
"""

from twilio.rest import Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_twilio_connection():
    """Test Twilio connection with your credentials"""
    
    # Your Twilio credentials
    account_sid = os.getenv('TWILIO_ACCOUNT_SID', 'your_twilio_account_sid_here')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN', 'your_twilio_auth_token_here')
    from_phone = os.getenv('TWILIO_PHONE_NUMBER', '+1234567890')
    
    print(f"Testing Twilio connection...")
    print(f"Account SID: {account_sid}")
    print(f"From Phone: {from_phone}")
    print("-" * 50)
    
    try:
        # Initialize Twilio client
        client = Client(account_sid, auth_token)
        
        # Test the connection by getting account info
        account = client.api.accounts(account_sid).fetch()
        print(f"✅ Successfully connected to Twilio!")
        print(f"Account Status: {account.status}")
        print(f"Account Type: {account.type}")
        
        # Test message sending (you need to replace the 'to' number)
        test_phone = input("\nEnter a phone number to test SMS (format: +1234567890): ").strip()
        
        if test_phone:
            print(f"\nSending test message to {test_phone}...")
            
            message = client.messages.create(
                from_=from_phone,
                body='VIVE LE QUEBEC LIBRE! 🇫🇷 This is a test message from NASA Arctic SMS service.',
                to=test_phone
            )
            
            print(f"✅ SMS sent successfully!")
            print(f"Message SID: {message.sid}")
            print(f"Status: {message.status}")
            
        else:
            print("⚠️ No phone number provided for SMS test.")
            
    except Exception as e:
        print(f"❌ Error testing Twilio connection: {str(e)}")
        print("\nPossible issues:")
        print("- Check your Twilio credentials")
        print("- Verify your Twilio account is active")
        print("- Check if your phone number is verified in Twilio console")

if __name__ == "__main__":
    test_twilio_connection()