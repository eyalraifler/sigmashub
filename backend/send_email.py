import os
from dotenv import load_dotenv
from email.message import EmailMessage
import ssl
import smtplib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def send_contact_email(name, sender_email, message):
    """Send a contact form submission to the SigmasHub inbox.

    Sends the message to the official SigmasHub Gmail account, with the
    Reply-To header set to the sender's address so replies go back to them.

    Args:
        name: The sender's name.
        sender_email: The sender's email address.
        message: The message body text.

    Raises:
        Exception: If the SMTP connection or sending fails.
    """
    email_sender = "sigmashubofficial@gmail.com"
    email_password = os.getenv("EMAIL_PASSWORD")

    subject = f"Contact Form – {name}"
    body = f"From: {name} <{sender_email}>\n\n{message}"

    em = EmailMessage()
    em['From'] = email_sender
    em['To'] = email_sender
    em['Reply-To'] = sender_email
    em['Subject'] = subject
    em.set_content(body)
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as smtp:
        smtp.login(email_sender, email_password)
        smtp.sendmail(email_sender, email_sender, em.as_string())


def send_verification_email(email_receiver, code):
    """Send a 6-digit verification code to the user's email address.

    Args:
        email_receiver: The recipient's email address.
        code: The 6-digit verification code string to include in the email.

    Raises:
        Exception: If the SMTP connection or sending fails.
    """
    email_sender = "sigmashubofficial@gmail.com"
    email_password = os.getenv("EMAIL_PASSWORD")


    subject = 'Verification code'
    body = f"""
    Your code is: {code}
    """

    em = EmailMessage()
    em['From'] = email_sender
    em['To'] = email_receiver
    em['Subject'] = subject
    em.set_content(body)
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as smtp:
        smtp.login(email_sender, email_password)
        smtp.sendmail(email_sender, email_receiver, em.as_string())
