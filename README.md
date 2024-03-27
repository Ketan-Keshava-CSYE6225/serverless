

```markdown
## Serverless with Cloud Functions

This repository contains code for implementing serverless architecture using Google Cloud Functions. The Cloud function is responsible for handling email verification for new user accounts created in a web application.

## Setup

To get started with this project, follow these steps:
```

1. **Install Dependencies:** Navigate to the project directory and install the required dependencies using npm:
   ```bash
   cd serverless
   npm install
   ```

2. **Set Up Environment Variables:** Create a `.env` file in the root of the project and add the following environment variables:
   ```dotenv
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_mailgun_domain
   MAILGUN_FROM="Firstname Lastname <firstnamelastname.me>"
   VERIFY_EMAIL_LINK=https://example.com/verify
   DATABASE_NAME=webapp
   DATABASE_USER=webapp
   DATABASE_PASSWORD=password
   DATABASE_HOST=localhost
   ```

3. **Set Up Pub/Sub Topic and Subscription:** Create a topic named `verify_email` and set up a subscription for the Cloud Function. Set the data retention period for the topic to be 7 days.

## Implementation Details

### Cloud Function

The Cloud function, `sendVerifyEmail`, is triggered by a Pub/Sub message when a new user account is created. It performs the following tasks:

- Emails the user a verification link to verify their email address. The link expires after 2 minutes.
- Tracks the emails sent in a CloudSQL instance, using the same instance and database used by the web application.

### Package.json

The `package.json` file specifies the dependencies required for the project.

## Usage

To deploy and run the Cloud Functions, you can use the Google Cloud Platform console or the gcloud CLI.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
