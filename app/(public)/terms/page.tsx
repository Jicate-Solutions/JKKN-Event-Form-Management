export const metadata = {
  title: 'Terms and Conditions - JKKN Event Forms',
  description:
    'Terms and conditions for using the JKKN Event Forms Management System.'
};

export default function TermsPage() {
  return (
    <div className='container mx-auto px-4 py-16'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold mb-8'>Terms and Conditions</h1>
        <p className='text-muted-foreground mb-8'>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className='prose prose-lg dark:prose-invert max-w-none'>
          <p>
            Please read these Terms and Conditions (&quot;Terms&quot;,
            &quot;Terms and Conditions&quot;) carefully before using the JKKN
            Event Forms Management System operated by JKKN Event Forms
            (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
          </p>

          <p>
            Your access to and use of the Service is conditioned on your
            acceptance of and compliance with these Terms. These Terms apply to
            all visitors, users, and others who access or use the Service.
          </p>

          <p>
            By accessing or using the Service, you agree to be bound by these
            Terms. If you disagree with any part of the terms, then you may not
            access the Service.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>1. Accounts</h2>

          <p>
            When you create an account with us, you must provide information
            that is accurate, complete, and current at all times. Failure to do
            so constitutes a breach of the Terms, which may result in immediate
            termination of your account on our Service.
          </p>

          <p>
            You are responsible for safeguarding the password that you use to
            access the Service and for any activities or actions under your
            password, whether your password is with our Service or a third-party
            service.
          </p>

          <p>
            You agree not to disclose your password to any third party. You must
            notify us immediately upon becoming aware of any breach of security
            or unauthorized use of your account.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            2. Intellectual Property
          </h2>

          <p>
            The Service and its original content, features, and functionality
            are and will remain the exclusive property of JKKN Event Forms and
            its licensors. The Service is protected by copyright, trademark, and
            other laws of both India and foreign countries. Our trademarks and
            trade dress may not be used in connection with any product or
            service without the prior written consent of JKKN Event Forms.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>3. User Content</h2>

          <p>
            Our Service allows you to post, link, store, share and otherwise
            make available certain information, text, graphics, videos, or other
            material (&quot;Content&quot;). You are responsible for the Content
            that you post on or through the Service, including its legality,
            reliability, and appropriateness.
          </p>

          <p>
            By posting Content on or through the Service, you represent and
            warrant that: (i) the Content is yours (you own it) or you have the
            right to use it and grant us the rights and license as provided in
            these Terms, and (ii) the posting of your Content on or through the
            Service does not violate the privacy rights, publicity rights,
            copyrights, contract rights or any other rights of any person.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>4. Payment Terms</h2>

          <p>
            Certain features of the Service may require payment. You agree to
            pay all fees or charges to your account based on the fee, charges,
            and billing terms in effect at the time a fee or charge is due and
            payable.
          </p>

          <p>
            All payments are processed through Razorpay, a third-party payment
            processor. By using our Service, you agree to be bound by
            Razorpay&apos;s Terms of Service and Privacy Policy.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>
            5. Limitation of Liability
          </h2>

          <p>
            In no event shall JKKN Event Forms, nor its directors, employees,
            partners, agents, suppliers, or affiliates, be liable for any
            indirect, incidental, special, consequential or punitive damages,
            including without limitation, loss of profits, data, use, goodwill,
            or other intangible losses, resulting from (i) your access to or use
            of or inability to access or use the Service; (ii) any conduct or
            content of any third party on the Service; (iii) any content
            obtained from the Service; and (iv) unauthorized access, use or
            alteration of your transmissions or content, whether based on
            warranty, contract, tort (including negligence) or any other legal
            theory, whether or not we have been informed of the possibility of
            such damage.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>6. Governing Law</h2>

          <p>
            These Terms shall be governed and construed in accordance with the
            laws of India, without regard to its conflict of law provisions.
          </p>

          <p>
            Our failure to enforce any right or provision of these Terms will
            not be considered a waiver of those rights. If any provision of
            these Terms is held to be invalid or unenforceable by a court, the
            remaining provisions of these Terms will remain in effect.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>7. Changes to Terms</h2>

          <p>
            We reserve the right, at our sole discretion, to modify or replace
            these Terms at any time. If a revision is material, we will try to
            provide at least 30 days&apos; notice prior to any new terms taking
            effect. What constitutes a material change will be determined at our
            sole discretion.
          </p>

          <p>
            By continuing to access or use our Service after those revisions
            become effective, you agree to be bound by the revised terms. If you
            do not agree to the new terms, please stop using the Service.
          </p>

          <h2 className='text-2xl font-bold mt-8 mb-4'>8. Contact Us</h2>

          <p>
            If you have any questions about these Terms, please contact us at
            admin@jicate.solutions.
          </p>
        </div>
      </div>
    </div>
  );
}
