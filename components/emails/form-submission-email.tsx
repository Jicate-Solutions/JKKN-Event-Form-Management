import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
  Row,
  Column,
} from '@react-email/components';

interface FormSubmissionEmailProps {
  formTitle: string;
  formDescription?: string;
  submissionId: string;
  submissionDate: string;
  userEmail: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentId?: string;
  paymentDate?: string;
}

export const FormSubmissionEmail: React.FC<Readonly<FormSubmissionEmailProps>> = ({
  formTitle,
  formDescription,
  submissionId,
  submissionDate,
  userEmail,
  paymentStatus,
  paymentAmount,
  paymentId,
  paymentDate,
}) => {
  const hasPayment = paymentStatus && paymentStatus !== 'not_required';
  
  return (
    <Html>
      <Head />
      <Preview>Form Submission Confirmation - {formTitle}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Form Submission Confirmation</Heading>
          
          <Section style={styles.section}>
            <Text style={styles.text}>
              Thank you for submitting the form <strong>{formTitle}</strong>.
            </Text>
            
            {formDescription && (
              <Text style={styles.text}>{formDescription}</Text>
            )}
            
            <Text style={styles.text}>
              Your submission has been received and is being processed.
            </Text>
          </Section>
          
          <Section style={styles.section}>
            <Heading as="h2" style={styles.subheading}>Submission Details</Heading>
            
            <Row style={styles.row}>
              <Column style={styles.column}>
                <Text style={styles.label}>Submission ID:</Text>
              </Column>
              <Column style={styles.column}>
                <Text style={styles.value}>{submissionId}</Text>
              </Column>
            </Row>
            
            <Row style={styles.row}>
              <Column style={styles.column}>
                <Text style={styles.label}>Submission Date:</Text>
              </Column>
              <Column style={styles.column}>
                <Text style={styles.value}>{submissionDate}</Text>
              </Column>
            </Row>
            
            <Row style={styles.row}>
              <Column style={styles.column}>
                <Text style={styles.label}>Email:</Text>
              </Column>
              <Column style={styles.column}>
                <Text style={styles.value}>{userEmail}</Text>
              </Column>
            </Row>
          </Section>
          
          {hasPayment && (
            <Section style={styles.section}>
              <Heading as="h2" style={styles.subheading}>Payment Information</Heading>
              
              <Row style={styles.row}>
                <Column style={styles.column}>
                  <Text style={styles.label}>Payment Status:</Text>
                </Column>
                <Column style={styles.column}>
                  <Text style={styles.value}>
                    {paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                  </Text>
                </Column>
              </Row>
              
              {paymentAmount && (
                <Row style={styles.row}>
                  <Column style={styles.column}>
                    <Text style={styles.label}>Amount:</Text>
                  </Column>
                  <Column style={styles.column}>
                    <Text style={styles.value}>₹{paymentAmount.toFixed(2)}</Text>
                  </Column>
                </Row>
              )}
              
              {paymentId && (
                <Row style={styles.row}>
                  <Column style={styles.column}>
                    <Text style={styles.label}>Payment ID:</Text>
                  </Column>
                  <Column style={styles.column}>
                    <Text style={styles.value}>{paymentId}</Text>
                  </Column>
                </Row>
              )}
              
              {paymentDate && (
                <Row style={styles.row}>
                  <Column style={styles.column}>
                    <Text style={styles.label}>Payment Date:</Text>
                  </Column>
                  <Column style={styles.column}>
                    <Text style={styles.value}>{paymentDate}</Text>
                  </Column>
                </Row>
              )}
            </Section>
          )}
          
          <Hr style={styles.hr} />
          
          <Text style={styles.footer}>
            This is an automated email. Please do not reply to this message.
          </Text>
          
          <Text style={styles.footer}>
            © {new Date().getFullYear()} JKKN Institutions. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  },
  container: {
    margin: '0 auto',
    padding: '20px 0',
    width: '100%',
    maxWidth: '600px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginTop: '30px',
    marginBottom: '30px',
    color: '#333',
    textAlign: 'center' as const,
  },
  subheading: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '20px',
    marginBottom: '15px',
    color: '#333',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '5px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  text: {
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
    color: '#333',
  },
  row: {
    marginBottom: '8px',
  },
  column: {
    display: 'inline-block',
    width: '50%',
  },
  label: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '4px',
    fontWeight: 'bold',
  },
  value: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px',
  },
  hr: {
    borderColor: '#e6ebf1',
    margin: '20px 0',
  },
  footer: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center' as const,
    marginTop: '12px',
  },
};

export default FormSubmissionEmail;
