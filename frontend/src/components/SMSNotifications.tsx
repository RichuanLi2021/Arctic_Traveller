import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './SMSNotifications.css';

interface ScheduledMessage {
  id: string;
  phone: string;
  message: string;
  scheduled_time: string;
  language: string;
  message_type: string;
  status: string;
  created_at: string;
  sent_at?: string;
}

const SMSNotifications: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const API_BASE = 'http://localhost:5000'; // Backend SMS service URL

  useEffect(() => {
    // Check if current phone is subscribed
    const currentPhone = localStorage.getItem('sms_phone');
    if (currentPhone) {
      setPhoneNumber(currentPhone);
      setIsSubscribed(true);
    }
    fetchScheduledMessages();
  }, []);

  const fetchScheduledMessages = async () => {
    try {
      const response = await fetch(`${API_BASE}/sms/scheduled`);
      if (response.ok) {
        const data = await response.json();
        setScheduledMessages(data.scheduled_messages || []);
      }
    } catch (error) {
      console.warn('Could not fetch scheduled messages:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!phoneNumber.trim()) {
      showMessage(t('sms.errors.phoneRequired'), 'error');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      showMessage(t('sms.errors.invalidPhone'), 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sms/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          language: i18n.language
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(true);
        localStorage.setItem('sms_phone', phoneNumber);
        showMessage(t('sms.subscribeSuccess'), 'success');
      } else {
        showMessage(data.error || t('sms.errors.subscribeFailed'), 'error');
      }
    } catch (error) {
      showMessage(t('sms.errors.serviceUnavailable'), 'error');
      console.error('Subscribe error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sms/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(false);
        localStorage.removeItem('sms_phone');
        showMessage(t('sms.unsubscribeSuccess'), 'success');
      } else {
        showMessage(data.error || t('sms.errors.unsubscribeFailed'), 'error');
      }
    } catch (error) {
      showMessage(t('sms.errors.serviceUnavailable'), 'error');
      console.error('Unsubscribe error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMessage = async () => {
    if (!scheduledDate || !scheduledTime) {
      showMessage(t('sms.errors.scheduleRequired'), 'error');
      return;
    }

    if (!customMessage.trim()) {
      showMessage(t('sms.errors.messageRequired'), 'error');
      return;
    }

    // Combine date and time into ISO format
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();

    if (scheduledDateTime <= now) {
      showMessage(t('sms.errors.pastDate'), 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sms/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: customMessage,
          scheduled_time: scheduledDateTime.toISOString(),
          language: i18n.language,
          type: 'custom'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(t('sms.scheduleSuccess'), 'success');
        setCustomMessage('');
        setScheduledDate('');
        setScheduledTime('');
        setShowScheduler(false);
        fetchScheduledMessages(); // Refresh scheduled messages
      } else {
        showMessage(data.error || t('sms.errors.scheduleFailed'), 'error');
      }
    } catch (error) {
      showMessage(t('sms.errors.serviceUnavailable'), 'error');
      console.error('Schedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScheduled = async (messageId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sms/scheduled/${messageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(t('sms.cancelSuccess'), 'success');
        fetchScheduledMessages(); // Refresh scheduled messages
      } else {
        showMessage(data.error || t('sms.errors.cancelFailed'), 'error');
      }
    } catch (error) {
      showMessage(t('sms.errors.serviceUnavailable'), 'error');
      console.error('Cancel error:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple phone number formatting for display
    return phone.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
  };

  return (
    <div className={`sms-notifications ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Compact Header - Always Visible */}
      <div className="sms-compact-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="compact-header-content">
          <span className="sms-icon">📱</span>
          <div className="header-text">
            <h3 className="compact-title">{t('sms.title')}</h3>
            {isSubscribed && (
              <span className="subscription-status">✅ {t('sms.subscribed')}</span>
            )}
          </div>
          <button className="expand-toggle" type="button">
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Expanded Content - Only shown when expanded */}
      {isExpanded && (
        <div className="sms-expanded-content">
          <div className="sms-description-expanded">
            <p>{t('sms.description')}</p>
          </div>

          <div className="sms-form">
            <div className="phone-input-group">
              <label htmlFor="phone-input">{t('sms.phoneLabel')}</label>
              <input
                id="phone-input"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('sms.phonePlaceholder')}
                disabled={loading}
                className="phone-input"
              />
            </div>

            <div className="sms-actions">
              {!isSubscribed ? (
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="subscribe-btn"
                >
                  {loading ? t('sms.subscribing') : t('sms.subscribe')}
                </button>
              ) : (
                <div className="subscribed-actions">
                  <button
                    onClick={handleUnsubscribe}
                    disabled={loading}
                    className="unsubscribe-btn"
                  >
                    {loading ? t('sms.unsubscribing') : t('sms.unsubscribe')}
                  </button>
                </div>
              )}
            </div>

            {message && (
              <div className={`sms-message ${messageType}`}>
                {message}
              </div>
            )}
          </div>

          {/* Scheduler Section */}
          <div className="sms-scheduler">
            <div className="scheduler-header">
              <h4>{t('sms.scheduler.title')}</h4>
              <button
                onClick={() => setShowScheduler(!showScheduler)}
                className="toggle-scheduler-btn"
              >
                {showScheduler ? t('sms.scheduler.hide') : t('sms.scheduler.show')}
              </button>
            </div>

            {showScheduler && (
              <div className="scheduler-content">
                <div className="datetime-inputs">
                  <div className="input-group">
                    <label htmlFor="scheduled-date">{t('sms.scheduler.date')}</label>
                    <input
                      id="scheduled-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      disabled={loading}
                      className="date-input"
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="scheduled-time">{t('sms.scheduler.time')}</label>
                    <input
                      id="scheduled-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      disabled={loading}
                      className="time-input"
                    />
                  </div>
                </div>

                <div className="scheduler-options">
                  <div className="option-group">
                    <h5>{t('sms.scheduler.personal')}</h5>
                    <div className="input-group">
                      <label htmlFor="custom-message">{t('sms.scheduler.customMessage')}</label>
                      <textarea
                        id="custom-message"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder={t('sms.scheduler.messagePlaceholder')}
                        disabled={loading}
                        className="message-textarea"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={handleScheduleMessage}
                      disabled={loading || !phoneNumber || !isSubscribed}
                      className="schedule-personal-btn"
                    >
                      {loading ? t('sms.scheduler.scheduling') : t('sms.scheduler.schedulePersonal')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Messages List */}
            {scheduledMessages.length > 0 && (
              <div className="scheduled-messages">
                <h5>{t('sms.scheduler.scheduledMessages')}</h5>
                <div className="scheduled-list">
                  {scheduledMessages
                    .filter(msg => msg.status === 'scheduled')
                    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
                    .map((msg) => (
                      <div key={msg.id} className="scheduled-item">
                        <div className="scheduled-info">
                          <div className="scheduled-phone">{formatPhoneNumber(msg.phone)}</div>
                          <div className="scheduled-time">
                            {new Date(msg.scheduled_time).toLocaleString()}
                          </div>
                          <div className="scheduled-message">{msg.message.substring(0, 50)}...</div>
                        </div>
                        <button
                          onClick={() => handleCancelScheduled(msg.id)}
                          disabled={loading}
                          className="cancel-scheduled-btn"
                        >
                          {t('sms.scheduler.cancel')}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSNotifications;