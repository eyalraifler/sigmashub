import os
from dotenv import load_dotenv
from email.message import EmailMessage
import ssl
import smtplib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def send_verification_email(email_receiver, code):
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
