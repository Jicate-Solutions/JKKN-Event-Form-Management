This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Email Notifications with Resend

This application uses [Resend](https://resend.com) to send email notifications for form submissions and payment confirmations.

### Setup Instructions

1. Create a Resend account at [resend.com](https://resend.com) and verify your domain
2. Generate an API key from the Resend dashboard
3. Add the following environment variables to your `.env` file:

```
# Resend API configuration
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=Your Name <no-reply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Use your production URL in production
```

### Email Features

- **Form Submission Notifications**: Automatically sends an email to users when they submit a form
- **Payment Confirmation Emails**: Sends payment details to users when their payment is successfully processed
- **Customizable Email Templates**: Email templates can be modified in the `components/emails` directory

### Troubleshooting

If emails are not being sent:

1. Check that the `RESEND_API_KEY` is correctly set in your environment variables
2. Verify that your domain is properly configured in the Resend dashboard
3. Check the server logs for any error messages related to email sending
4. Ensure that the `EMAIL_FROM` address uses a domain that is verified in your Resend account
