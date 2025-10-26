from twilio.rest import Client
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta
import threading
import time
import json

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SMSService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID', 'your_twilio_account_sid_here')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN', 'your_twilio_auth_token_here')
        self.from_phone = os.getenv('TWILIO_PHONE_NUMBER', '+1234567890')
        
        # Initialize Twilio client
        self.client = Client(self.account_sid, self.auth_token)
        
        # Store for demo purposes (in production, use a database)
        self.subscribers = []
        self.scheduled_messages = []
        self.scheduler_running = False
        
        # Start the scheduler thread
        self.start_scheduler()
        
        logger.info("SMS Service initialized successfully")
    
    def send_sms(self, to_phone, message_body, language='en'):
        """Send SMS message to a phone number"""
        try:
            # Add language-specific greeting
            if language == 'fr':
                greeting = "🇫🇷 Mise à jour NASA Arctique:\n\n"
            else:
                greeting = "🇺🇸 NASA Arctic Update:\n\n"
            
            full_message = greeting + message_body
            
            message = self.client.messages.create(
                from_=self.from_phone,
                body=full_message,
                to=to_phone
            )
            
            logger.info(f"SMS sent successfully to {to_phone}. Message SID: {message.sid}")
            return {
                'success': True,
                'message_sid': message.sid,
                'to': to_phone,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'to': to_phone,
                'timestamp': datetime.now().isoformat()
            }
    
    def add_subscriber(self, phone_number, language='en'):
        """Add a new SMS subscriber"""
        subscriber = {
            'phone': phone_number,
            'language': language,
            'subscribed_at': datetime.now().isoformat(),
            'active': True
        }
        
        # Check if already subscribed
        existing = next((s for s in self.subscribers if s['phone'] == phone_number), None)
        if existing:
            existing['language'] = language  # Update language preference
            existing['active'] = True
            return {'success': True, 'message': 'Subscription updated', 'subscriber': existing}
        
        self.subscribers.append(subscriber)
        logger.info(f"New subscriber added: {phone_number} ({language})")
        return {'success': True, 'message': 'Subscribed successfully', 'subscriber': subscriber}
    
    def remove_subscriber(self, phone_number):
        """Remove SMS subscriber"""
        subscriber = next((s for s in self.subscribers if s['phone'] == phone_number), None)
        if subscriber:
            subscriber['active'] = False
            logger.info(f"Subscriber removed: {phone_number}")
            return {'success': True, 'message': 'Unsubscribed successfully'}
        
        return {'success': False, 'message': 'Phone number not found'}
    
    def send_arctic_update(self, data_type='ice_loss', language='en'):
        """Send Arctic ice update to all active subscribers in their preferred language"""
        active_subscribers = [s for s in self.subscribers if s.get('active', True)]
        
        if not active_subscribers:
            return {'success': True, 'message': 'No active subscribers', 'sent_count': 0}
        
        # Generate dummy data message
        if language == 'fr':
            messages = {
                'ice_loss': f"Perte de glace arctique: -2.3% ce mois-ci. Température moyenne: -8.5°C. Données mises à jour le {datetime.now().strftime('%d/%m/%Y')}.",
                'temperature': f"Température arctique: -8.5°C (variation de +1.2°C). Tendance mensuelle: réchauffement.",
                'general': "VIVE LE QUEBEC LIBRE! 🇫🇷 Mise à jour des données arctiques disponible."
            }
        else:
            messages = {
                'ice_loss': f"Arctic ice loss: -2.3% this month. Average temperature: -8.5°C. Data updated on {datetime.now().strftime('%m/%d/%Y')}.",
                'temperature': f"Arctic temperature: -8.5°C (+1.2°C change). Monthly trend: warming.",
                'general': "Arctic data update available. Check the NASA dashboard for details."
            }
        
        message_body = messages.get(data_type, messages['general'])
        results = []
        
        for subscriber in active_subscribers:
            # Use subscriber's language preference or fall back to provided language
            sub_language = subscriber.get('language', language)
            
            # Generate message in subscriber's preferred language if different
            if sub_language != language:
                if sub_language == 'fr':
                    sub_message = messages.get(data_type, messages['general']) if language == 'fr' else {
                        'ice_loss': f"Perte de glace arctique: -2.3% ce mois-ci. Température moyenne: -8.5°C. Données mises à jour le {datetime.now().strftime('%d/%m/%Y')}.",
                        'temperature': f"Température arctique: -8.5°C (variation de +1.2°C). Tendance mensuelle: réchauffement.",
                        'general': "VIVE LE QUEBEC LIBRE! 🇫🇷 Mise à jour des données arctiques disponible."
                    }.get(data_type, "VIVE LE QUEBEC LIBRE! 🇫🇷 Mise à jour des données arctiques disponible.")
                else:
                    sub_message = messages.get(data_type, messages['general']) if language == 'en' else {
                        'ice_loss': f"Arctic ice loss: -2.3% this month. Average temperature: -8.5°C. Data updated on {datetime.now().strftime('%m/%d/%Y')}.",
                        'temperature': f"Arctic temperature: -8.5°C (+1.2°C change). Monthly trend: warming.",
                        'general': "Arctic data update available. Check the NASA dashboard for details."
                    }.get(data_type, "Arctic data update available. Check the NASA dashboard for details.")
            else:
                sub_message = message_body
            
            result = self.send_sms(subscriber['phone'], sub_message, sub_language)
            results.append(result)
        
        sent_count = sum(1 for r in results if r['success'])
        return {
            'success': True,
            'message': f'Update sent to {sent_count}/{len(active_subscribers)} subscribers',
            'sent_count': sent_count,
            'total_subscribers': len(active_subscribers),
            'results': results
        }
    
    def schedule_message(self, phone_number, message, scheduled_time, language='en', message_type='custom'):
        """Schedule an SMS message for a future date/time"""
        try:
            # Parse the scheduled time
            if isinstance(scheduled_time, str):
                scheduled_datetime = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            else:
                scheduled_datetime = scheduled_time
            
            # Check if the scheduled time is in the future
            if scheduled_datetime <= datetime.now():
                return {
                    'success': False,
                    'error': 'Scheduled time must be in the future',
                    'scheduled_time': scheduled_time
                }
            
            scheduled_msg = {
                'id': f"sms_{int(time.time())}_{len(self.scheduled_messages)}",
                'phone': phone_number,
                'message': message,
                'scheduled_time': scheduled_datetime,
                'language': language,
                'message_type': message_type,
                'status': 'scheduled',
                'created_at': datetime.now().isoformat(),
                'sent_at': None
            }
            
            self.scheduled_messages.append(scheduled_msg)
            logger.info(f"Message scheduled for {phone_number} at {scheduled_datetime}")
            
            return {
                'success': True,
                'message': 'SMS scheduled successfully',
                'scheduled_message': scheduled_msg
            }
            
        except Exception as e:
            logger.error(f"Failed to schedule SMS: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_scheduled_message(self, message_id):
        """Cancel a scheduled SMS message"""
        for msg in self.scheduled_messages:
            if msg['id'] == message_id and msg['status'] == 'scheduled':
                msg['status'] = 'cancelled'
                logger.info(f"Scheduled message {message_id} cancelled")
                return {'success': True, 'message': 'Scheduled message cancelled'}
        
        return {'success': False, 'message': 'Scheduled message not found or already sent'}
    
    def get_scheduled_messages(self, phone_number=None):
        """Get scheduled messages, optionally filtered by phone number"""
        if phone_number:
            messages = [msg for msg in self.scheduled_messages if msg['phone'] == phone_number]
        else:
            messages = self.scheduled_messages
        
        return {
            'success': True,
            'scheduled_messages': messages,
            'count': len(messages)
        }
    
    def start_scheduler(self):
        """Start the background scheduler thread"""
        if not self.scheduler_running:
            self.scheduler_running = True
            scheduler_thread = threading.Thread(target=self._scheduler_worker, daemon=True)
            scheduler_thread.start()
            logger.info("SMS Scheduler started")
    
    def _scheduler_worker(self):
        """Background worker that checks for scheduled messages to send"""
        while self.scheduler_running:
            try:
                current_time = datetime.now()
                
                for msg in self.scheduled_messages:
                    if (msg['status'] == 'scheduled' and 
                        msg['scheduled_time'] <= current_time):
                        
                        # Send the scheduled message
                        result = self.send_sms(
                            msg['phone'], 
                            msg['message'], 
                            msg['language']
                        )
                        
                        # Update message status
                        if result['success']:
                            msg['status'] = 'sent'
                            msg['sent_at'] = current_time.isoformat()
                            logger.info(f"Scheduled message {msg['id']} sent successfully")
                        else:
                            msg['status'] = 'failed'
                            msg['error'] = result.get('error', 'Unknown error')
                            logger.error(f"Failed to send scheduled message {msg['id']}: {result.get('error')}")
                
                # Sleep for 30 seconds before checking again
                time.sleep(30)
                
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                time.sleep(60)  # Wait longer on error

# Initialize SMS service
sms_service = SMSService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'NASA SMS Service'})

@app.route('/sms/send', methods=['POST'])
def send_sms():
    """Send SMS to a specific phone number"""
    data = request.get_json()
    
    if not data or 'phone' not in data or 'message' not in data:
        return jsonify({'error': 'Phone number and message are required'}), 400
    
    phone = data['phone']
    message = data['message']
    language = data.get('language', 'en')
    
    result = sms_service.send_sms(phone, message, language)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500

@app.route('/sms/subscribe', methods=['POST'])
def subscribe():
    """Subscribe a phone number to SMS updates"""
    data = request.get_json()
    
    if not data or 'phone' not in data:
        return jsonify({'error': 'Phone number is required'}), 400
    
    phone = data['phone']
    language = data.get('language', 'en')
    
    result = sms_service.add_subscriber(phone, language)
    return jsonify(result), 200

@app.route('/sms/unsubscribe', methods=['POST'])
def unsubscribe():
    """Unsubscribe a phone number from SMS updates"""
    data = request.get_json()
    
    if not data or 'phone' not in data:
        return jsonify({'error': 'Phone number is required'}), 400
    
    phone = data['phone']
    result = sms_service.remove_subscriber(phone)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 404

@app.route('/sms/subscribers', methods=['GET'])
def get_subscribers():
    """Get list of all subscribers"""
    active_subscribers = [s for s in sms_service.subscribers if s.get('active', True)]
    return jsonify({
        'subscribers': active_subscribers,
        'total_count': len(active_subscribers)
    })

@app.route('/sms/broadcast', methods=['POST'])
def broadcast_update():
    """Send Arctic update to all subscribers"""
    data = request.get_json() or {}
    
    data_type = data.get('type', 'general')
    language = data.get('language', 'en')
    
    result = sms_service.send_arctic_update(data_type, language)
    return jsonify(result), 200

@app.route('/sms/test', methods=['POST'])
def test_sms():
    """Test SMS functionality with dummy data"""
    # Use a test phone number (replace XXXXXXXXXX with actual number for testing)
    test_phone = "+1XXXXXXXXXX"  # Update this for actual testing
    test_message = "VIVE LE QUEBEC LIBRE! 🇫🇷 This is a test message from NASA Arctic SMS service."
    
    result = sms_service.send_sms(test_phone, test_message, 'fr')
    return jsonify(result)

@app.route('/sms/schedule', methods=['POST'])
def schedule_sms():
    """Schedule an SMS message for a future date/time"""
    data = request.get_json()
    
    required_fields = ['phone', 'message', 'scheduled_time']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Phone number, message, and scheduled_time are required'}), 400
    
    phone = data['phone']
    message = data['message']
    scheduled_time = data['scheduled_time']
    language = data.get('language', 'en')
    message_type = data.get('type', 'custom')
    
    result = sms_service.schedule_message(phone, message, scheduled_time, language, message_type)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@app.route('/sms/scheduled', methods=['GET'])
def get_scheduled():
    """Get all scheduled messages or filter by phone number"""
    phone = request.args.get('phone')
    result = sms_service.get_scheduled_messages(phone)
    return jsonify(result), 200

@app.route('/sms/scheduled/<message_id>', methods=['DELETE'])
def cancel_scheduled(message_id):
    """Cancel a scheduled SMS message"""
    result = sms_service.cancel_scheduled_message(message_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 404

@app.route('/sms/schedule/arctic', methods=['POST'])
def schedule_arctic_update():
    """Schedule an Arctic data update for all subscribers"""
    data = request.get_json() or {}
    
    required_fields = ['scheduled_time']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'scheduled_time is required'}), 400
    
    scheduled_time = data['scheduled_time']
    data_type = data.get('type', 'general')
    language = data.get('language', 'en')
    
    # Get all active subscribers
    active_subscribers = [s for s in sms_service.subscribers if s.get('active', True)]
    
    if not active_subscribers:
        return jsonify({'success': False, 'message': 'No active subscribers to schedule for'}), 400
    
    # Generate the Arctic update message
    if language == 'fr':
        messages = {
            'ice_loss': f"Rapport programmé: Perte de glace arctique de -2.3% ce mois-ci. Température: -8.5°C. Données du {datetime.now().strftime('%d/%m/%Y')}.",
            'temperature': f"Rapport programmé: Température arctique -8.5°C (+1.2°C variation). Tendance: réchauffement.",
            'general': "VIVE LE QUEBEC LIBRE! 🇫🇷 Rapport programmé des données arctiques NASA."
        }
    else:
        messages = {
            'ice_loss': f"Scheduled Report: Arctic ice loss -2.3% this month. Temperature: -8.5°C. Data from {datetime.now().strftime('%m/%d/%Y')}.",
            'temperature': f"Scheduled Report: Arctic temperature -8.5°C (+1.2°C change). Trend: warming.",
            'general': "Scheduled NASA Arctic data report available."
        }
    
    message_body = messages.get(data_type, messages['general'])
    scheduled_messages = []
    
    # Schedule message for each subscriber
    for subscriber in active_subscribers:
        sub_language = subscriber.get('language', language)
        
        # Get message in subscriber's language
        if sub_language != language:
            if sub_language == 'fr':
                sub_message = {
                    'ice_loss': f"Rapport programmé: Perte de glace arctique de -2.3% ce mois-ci. Température: -8.5°C. Données du {datetime.now().strftime('%d/%m/%Y')}.",
                    'temperature': f"Rapport programmé: Température arctique -8.5°C (+1.2°C variation). Tendance: réchauffement.",
                    'general': "VIVE LE QUEBEC LIBRE! 🇫🇷 Rapport programmé des données arctiques NASA."
                }.get(data_type, "VIVE LE QUEBEC LIBRE! 🇫🇷 Rapport programmé des données arctiques NASA.")
            else:
                sub_message = {
                    'ice_loss': f"Scheduled Report: Arctic ice loss -2.3% this month. Temperature: -8.5°C. Data from {datetime.now().strftime('%m/%d/%Y')}.",
                    'temperature': f"Scheduled Report: Arctic temperature -8.5°C (+1.2°C change). Trend: warming.",
                    'general': "Scheduled NASA Arctic data report available."
                }.get(data_type, "Scheduled NASA Arctic data report available.")
        else:
            sub_message = message_body
        
        result = sms_service.schedule_message(
            subscriber['phone'], 
            sub_message, 
            scheduled_time, 
            sub_language, 
            f'arctic_{data_type}'
        )
        
        if result['success']:
            scheduled_messages.append(result['scheduled_message'])
    
    return jsonify({
        'success': True,
        'message': f'Arctic update scheduled for {len(scheduled_messages)} subscribers',
        'scheduled_count': len(scheduled_messages),
        'scheduled_time': scheduled_time,
        'scheduled_messages': scheduled_messages
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)