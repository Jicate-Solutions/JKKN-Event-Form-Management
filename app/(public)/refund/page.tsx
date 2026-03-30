export const metadata = {
  title: 'Refund Policy - JKKN Event Forms',
  description:
    'Cancellation and refund policy for the JKKN Event Forms Management System.'
};

export default function RefundPage() {
  return (
    <div className='container mx-auto px-4 py-16'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold mb-8'>
          Cancellation and Refund Policy
        </h1>
        <p className='text-muted-foreground mb-8'>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className='prose prose-lg dark:prose-invert max-w-none'>
          <p>
            This Cancellation and Refund Policy outlines the terms and
            conditions for cancellations and refunds related to event
            registrations and payments made through the JKKN Event Forms
            Management System.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            1. Event Registration Cancellations
          </h2>

          <h3 className='text-xl font-semibold mt-6 mb-3'>
            Cancellation by Participants
          </h3>

          <p>
            Participants who have registered for an event through our platform
            may request a cancellation subject to the following conditions:
          </p>

          <ul className='list-disc pl-6 my-4'>
            <li>
              <strong>Full Refund:</strong> Cancellations made 14 or more days
              prior to the event date will receive a full refund of the
              registration fee, minus any applicable processing fees.
            </li>
            <li>
              <strong>Partial Refund:</strong> Cancellations made between 7-13
              days prior to the event date will receive a 50% refund of the
              registration fee, minus any applicable processing fees.
            </li>
            <li>
              <strong>No Refund:</strong> Cancellations made less than 7 days
              prior to the event date will not be eligible for a refund.
            </li>
          </ul>

          <p>
            All cancellation requests must be submitted in writing to the event
            organizer or through the platform&apos;s cancellation request
            feature.
          </p>

          <h3 className='text-xl font-semibold mt-6 mb-3'>
            Cancellation by Event Organizers
          </h3>

          <p>In the event that an organizer cancels an event:</p>

          <ul className='list-disc pl-6 my-4'>
            <li>
              <strong>Full Refund:</strong> Participants will receive a full
              refund of their registration fee, including any processing fees
              that were charged.
            </li>
            <li>
              <strong>Rescheduling:</strong> If the event is rescheduled,
              participants will have the option to either attend the rescheduled
              event or request a full refund.
            </li>
          </ul>

          <h2 className='text-2xl font-bold mt-8 mb-4'>2. Refund Process</h2>

          <p>
            All refunds will be processed through the original payment method
            used for the registration. The time frame for receiving a refund
            depends on the payment method:
          </p>

          <ul className='list-disc pl-6 my-4'>
            <li>
              <strong>Credit/Debit Cards:</strong> Refunds typically appear
              within 5-10 business days, depending on the card issuer&apos;s
              policies.
            </li>
            <li>
              <strong>UPI Payments:</strong> Refunds typically appear within 3-5
              business days.
            </li>
            <li>
              <strong>Net Banking:</strong> Refunds typically appear within 5-7
              business days.
            </li>
          </ul>

          <p>
            Please note that while we process refunds promptly, the actual time
            for the refund to appear in your account depends on your financial
            institution.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            3. Non-Refundable Items
          </h2>

          <p>The following items are generally non-refundable:</p>

          <ul className='list-disc pl-6 my-4'>
            <li>
              Convenience fees or service charges, unless the event is cancelled
              by the organizer.
            </li>
            <li>
              Additional purchases such as merchandise, unless specifically
              stated as refundable by the event organizer.
            </li>
            <li>
              Registration fees for events clearly marked as
              &quot;non-refundable&quot; at the time of registration.
            </li>
          </ul>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            4. Special Circumstances
          </h2>

          <p>
            In cases of unforeseen circumstances such as natural disasters,
            health emergencies, or other force majeure events that prevent the
            event from taking place:
          </p>

          <ul className='list-disc pl-6 my-4'>
            <li>
              Event organizers may offer full or partial refunds at their
              discretion.
            </li>
            <li>
              Event organizers may offer the option to transfer registration to
              a future event instead of a refund.
            </li>
            <li>
              Each case will be evaluated individually based on the specific
              circumstances.
            </li>
          </ul>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            5. Disputes and Exceptions
          </h2>

          <p>
            If you believe you are entitled to a refund that has not been
            processed or have a dispute regarding the refund policy:
          </p>

          <ul className='list-disc pl-6 my-4'>
            <li>Contact the event organizer directly to resolve the issue.</li>
            <li>
              If the issue cannot be resolved with the event organizer, contact
              our customer support team at support@jkkneventforms.com.
            </li>
            <li>
              Provide all relevant details including your registration
              confirmation, payment receipts, and communication with the event
              organizer.
            </li>
          </ul>

          <p>
            We will review each case individually and work to find a fair
            resolution.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            6. Changes to This Policy
          </h2>

          <p>
            We reserve the right to modify this Cancellation and Refund Policy
            at any time. Changes will be effective immediately upon posting to
            our website. It is your responsibility to review this policy
            periodically.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>7. Contact Us</h2>

          <p>
            If you have any questions about our Cancellation and Refund Policy,
            please contact us:
          </p>

          <ul className='list-disc pl-6 my-4'>
            <li>By email: admin@jicate.solutions</li>
            <li>By phone: +91 8760083627</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
