import { cloudEvent } from "@google-cloud/functions-framework";
import mailgun from "mailgun-js";
import { DataTypes, Model, Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Variables
dotenv.config();
const mailgunApiKey = process.env.MAILGUN_API_KEY || "xxx";
const mailgunDomain = process.env.MAILGUN_DOMAIN || "firstnamelastname.me";
const mailgunFrom =
  process.env.MAILGUN_FROM || "Firstname Lastname <firstnamelastname.me>";
const verifyEmailLink =
  process.env.VERIFY_EMAIL_LINK || "https://example.com/verify";
const postgresDBName = process.env.DATABASE_NAME || "webapp";
const postgresDBUser = process.env.DATABASE_USER || "webapp";
const postgresDBPassword = process.env.DATABASE_PASSWORD || "password";
const postgresDBHost = process.env.DATABASE_HOST || "localhost";
const mailVerificationExpiryTime = parseInt(process.env.VERIFICATION_LINK_TIME_WINDOW) || 120000; // default: 2 minutes

// Clients
const mailgunClient = mailgun({ apiKey: mailgunApiKey, domain: mailgunDomain });
export const postgresDBConnection = new Sequelize(
  postgresDBName,
  postgresDBUser,
  postgresDBPassword,
  {
    host: postgresDBHost,
    dialect: "postgres",
  }
);

// Models
export const User = postgresDBConnection.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      noUpdate: true //Adds no update/readonly attributes support to models
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        // You can hash the password here before saving it to the database
        // Example: this.setDataValue('password', hashFunction(value));
        this.setDataValue('password', value);
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    account_created: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false,
      noUpdate: true //Adds no update/readonly attributes support to models
    },
    account_updated: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false
    },
    verification_token: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: Sequelize.UUIDV4
    },
    verification_link_expiry_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    user_verification_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    // timestamps: false, // Disable sequelize's default timestamps (createdAt, updatedAt)
    tableName: 'users', // Define the table name explicitly
    createdAt: 'account_created',
    updatedAt: 'account_updated',
    indexes: [
      {
        unique: true,
        fields: ['username']
      }
    ]
  }
);

cloudEvent("sendVerifyEmail", async (payload) => {
  const payloadMessage = payload.data.message.data;

  const message = JSON.parse(Buffer.from(payloadMessage, "base64").toString());

  const token = message.token;
  const email = message.email;

  await sendVerificationEmail(email, token);
});

export const sendVerificationEmail = async (email, token) => {
  const emailData = {
    from: mailgunFrom,
    to: email,
    subject: "Webapp: Verify your email address",
    text: `Click here to verify your email:\n${verifyEmailLink}/${token}\n`,
  };

  mailgunClient.messages().send(emailData, async (error, body) => {
    if (error) {
      console.error(
        `[Cloud Function: Send Verification Email] Error sending verification email to ${email}, error:` +
          error.message
      );
    } else {
      console.info(
        `[Cloud Function: Send Verification Email] Verification email sent to ${email} with id ${token} and messageId ${body.id}`
      );
      await updateVerificationEmailSentTimestamp(token);
    }
  });
};

export const updateVerificationEmailSentTimestamp = async (token) => {
  const currentTimestamp = new Date().getTime();
  try {
    const user = await User.findOne({
      where: {
        verification_token: token,
      },
    });
    user.verification_link_expiry_timestamp = new Date(currentTimestamp + mailVerificationExpiryTime);
    await user.save();

    console.info(
      `[Cloud Function: Send Verification Email] ${user.id} expiry timestamp: ${new Date(currentTimestamp + mailVerificationExpiryTime)}`
    );

    console.info(
      `[Cloud Function: Send Verification Email] ${user.id} verification email sent at ${currentTimestamp}`
    );
  } catch (error) {
    console.error(
      `[Cloud Function: Send Verification Email] Error updating verification email sent timestamp for ${token}, error:` +
        error.message
    );
  }
};