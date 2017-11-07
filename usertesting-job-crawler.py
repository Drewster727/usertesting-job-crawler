#!/usr/bin/env python

# Note: for setting up email with sendmail, see: http://linuxconfig.org/configuring-gmail-as-sendmail-email-relay

import argparse
import commands
import json
import logging
import smtplib
import sys

from datetime import datetime
from os import path
from subprocess import check_output
from distutils.spawn import find_executable


EMAIL_TEMPLATE = "some stuff %s"

def notify_send_email(settings, use_gmail=False):
    sender = settings.get('email_from')
    recipient = settings.get('email_to', sender)  # If recipient isn't provided, send to self.

    try:
        if use_gmail:
            password = settings.get('gmail_password')
            if not password:
                logging.warning('Trying to send from gmail, but password was not provided.')
                return
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender, password)
        else:
            username = settings.get('email_username').encode('utf-8')
            password = settings.get('email_password').encode('utf-8')
            server = smtplib.SMTP(settings.get('email_server'), settings.get('email_port'))
            server.ehlo()
            server.starttls()
            server.ehlo()
            if username:
                    server.login(username, password)

        subject = "Alert: New User Testing Tests Available"
        headers = "\r\n".join(["from: %s" % sender,
                               "subject: %s" % subject,
                               "to: %s" % recipient,
                               "mime-version: 1.0",
                               "content-type: text/html"])
        message = EMAIL_TEMPLATE % "test"
        content = headers + "\r\n\r\n" + message

        server.sendmail(sender, recipient, content)
        server.quit()
    except Exception:
        logging.exception('Failed to send succcess e-mail.')
        log(e)

def main(settings):
    try:
        # Run the phantom JS script - output will be formatted like 'July 20, 2015'
        # script_output = check_output(['phantomjs', '%s/usertesting-job-crawler.js' % pwd]).strip()

        # determine phantomjs or fail
        cmd = find_executable('phantomjs') or find_executable('/usr/local/bin/phantomjs')
        if not cmd:
            logging.critical('Cannot find phantomjs. Make sure it is in your path.')
            return

        script_output = check_output([cmd, '--ssl-protocol=any', '%s/usertesting-job-crawler.js' % pwd, '--config', settings.get('configfile')]).strip()

        if script_output == 'None':
            logging.info('No tests available.')
            return

        // # TODO: get json output back from script_output, insert that into email with the image

    except ValueError:
        logging.critical("Couldn't convert output: {} from phantomJS script into a valid ... ".format(script_output))
        return
    except OSError:
        logging.critical("Something went wrong when trying to run usertesting-job-crawler.js. Is phantomjs is installed?")
        return

    logging.info(msg + (' Sending email.' if not settings.get('no_email') else ' Not sending email.'))
    if not settings.get('no_email'):
        notify_send_email(settings, use_gmail=settings.get('use_gmail'))


def _check_settings(config):
    required_settings = (
        'username',
        'password'
    )

    for setting in required_settings:
        if not config.get(setting):
            raise ValueError('Missing setting %s in config.json file.' % setting)

    if config.get('no_email') == False and not config.get('email_from'): # email_to is not required; will default to email_from if not set
        raise ValueError('email_to and email_from required for sending email. (Run with --no-email or no_email=True to disable email.)')

    if config.get('use_gmail') and not config.get('gmail_password'):
        raise ValueError('gmail_password not found in config but is required when running with use_gmail option')

if __name__ == '__main__':

    # Configure Basic Logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(levelname)s: %(asctime)s %(message)s',
        datefmt='%m/%d/%Y %I:%M:%S %p',
        stream=sys.stdout,
    )

    pwd = path.dirname(sys.argv[0])

    # Parse Arguments
    parser = argparse.ArgumentParser(description="Command line script to check for usertesting.com tests.")
    parser.add_argument('--no-email', action='store_true', dest='no_email', default=False, help='Don\'t send an e-mail when the script runs.')
    parser.add_argument('--use-gmail', action='store_true', dest='use_gmail', default=False, help='Use the gmail SMTP server instead of sendmail.')
    parser.add_argument('--config', dest='configfile', default='%s/config.json' % pwd, help='Config file to use (default is config.json)')
    arguments = vars(parser.parse_args())
    logging.info("config file is:" + arguments['configfile'])
    # Load Settings
    try:
        with open(arguments['configfile']) as json_file:
            settings = json.load(json_file)

            # merge args into settings IF they're True
            for key, val in arguments.iteritems():
                if not arguments.get(key): continue
                settings[key] = val

            settings['configfile'] = arguments['configfile']
            _check_settings(settings)
    except Exception as e:
        logging.error('Error loading settings from config.json file: %s' % e)
        sys.exit()

    # Configure File Logging
    if settings.get('logfile'):
        handler = logging.FileHandler('%s/%s' % (pwd, settings.get('logfile')))
        handler.setFormatter(logging.Formatter('%(levelname)s: %(asctime)s %(message)s'))
        handler.setLevel(logging.DEBUG)
        logging.getLogger('').addHandler(handler)

    logging.debug('Running cron with arguments: %s' % arguments)

    main(settings)
