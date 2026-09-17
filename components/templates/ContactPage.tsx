import '@/styles/contact.css';
import { Icon } from '@/components/chrome/Icon';
import { Accordion } from '@/components/islands/Accordion';
import { ContactForm } from '@/components/islands/ContactForm';
import { BookingSheet } from '@/components/islands/BookingSheet';
import { FloatingCta } from '@/components/chrome/FloatingCta';
import type { BookingContext } from '@/lib/booking/types';
import type { BookingOption } from '@/lib/content/assemble';

const NATIONAL_PHONE = '1-800-362-4840';
const NATIONAL_PHONE_HREF = 'tel:18003624840';
// Same "Call Us Now" number the homepage hero and the About page show — one number, everywhere.
const HERO_PHONE = '888-855-2889';
const HERO_PHONE_HREF = 'tel:8888552889';

const FAQS = [
  {
    question: 'What Chimney services do you offer?',
    answer: 'We provide residential and commercial chimney services, including repairs, cleaning, installation, inspections, and more.',
  },
  {
    question: 'Do you offer 24/7 Chimney services?',
    answer:
      'We offer flexible scheduling and can accommodate urgent requests during business hours — call our team to check same-day availability in your area.',
  },
  {
    question: 'How can I schedule a service appointment?',
    answer: "Book online in minutes with our scheduler, or call our team directly and we'll find a time that works for you.",
  },
  {
    question: 'How much do your services cost?',
    answer:
      'Pricing depends on the service and your location. Chimney sweeps, inspections and gas diagnostics start at a set rate — request a quote for repair or masonry work.',
  },
  {
    question: 'Do you offer warranties on your work?',
    answer: 'Yes — our repair and installation work is backed by a workmanship warranty. Ask your technician for details specific to your service.',
  },
];

export function ContactPage({ booking, bookingContext }: { booking: BookingOption[]; bookingContext: BookingContext }) {
  return (
    <>
      <main id="main" className="tpl-contact">
        <section className="section">
          <div className="wrap">
            <div className="sec-top center">
              <p className="chip">
                <Icon name="user" className="ico" />
                Contact us
              </p>
              <h1>Contact us</h1>
            </div>

            <div className="contact-grid">
              <div className="contact-info">
                <h2>Get in Touch with Us</h2>
                <p>Reach out to us for inquiries, support, or partnership opportunities. We&rsquo;re here to assist you!</p>

                <div className="contact-methods">
                  <div className="contact-method">
                    <span className="cm-icon">
                      <Icon name="phone" />
                    </span>
                    <span className="cm-label">{HERO_PHONE}</span>
                    <a className="btn btn-primary btn-sm" href={HERO_PHONE_HREF}>
                      Call Now
                    </a>
                  </div>
                  <div className="contact-method">
                    <span className="cm-icon">
                      <Icon name="cal" />
                    </span>
                    <span className="cm-label">Online Appointment</span>
                    <a className="btn btn-primary btn-sm" href="#booking" data-book>
                      Schedule
                    </a>
                  </div>
                </div>
              </div>

              <div className="contact-form-card">
                <h2>Send Us a Message</h2>
                <p>Use our convenient contact form to reach out with questions, feedback, or collaboration inquiries.</p>
                <ContactForm pageSlug="/contact-us/" />
              </div>
            </div>
          </div>
        </section>

        <section className="section tinted" id="faq">
          <div className="wrap faq-grid">
            <div className="faq-intro">
              <p className="chip">
                <Icon name="help" className="ico" />
                Questions &amp; Answers
              </p>
              <h2>Frequently Asked Questions</h2>
              <figure>
                {/* Same photo as the homepage's FAQ section (app/_home/content.ts), so the two pages' FAQs read as one design. */}
                <img
                  src="/home/f74cc74bdab4.webp"
                  alt="Family gathered by their fireplace"
                  title="Family gathered by their fireplace"
                  loading="lazy"
                  decoding="async"
                  width={687}
                  height={1024}
                />
              </figure>
            </div>

            <div className="faq-panel">
              <Accordion mode="single" className="faq">
                {FAQS.map((f, i) => (
                  <div className={i === 0 ? 'faq-item is-open' : 'faq-item'} key={f.question} data-acc-item>
                    <button className="faq-q" type="button" aria-expanded={i === 0} data-acc-trigger>
                      <span className="faq-q-text">{f.question}</span>
                      <span className="faq-q-icon">
                        <Icon name="plus" className="ico icon-plus" />
                        <Icon name="minus" className="ico icon-minus" />
                      </span>
                    </button>
                    <div className="acc-panel">
                      <div>
                        <p className="faq-a">{f.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </Accordion>

              <div className="faq-help">
                <h3>
                  Need More <span className="accent">Help?</span>
                </h3>
                <p>Contact us for support, inquiries, we&rsquo;re happy to assist!</p>
                <a className="btn btn-primary" href={HERO_PHONE_HREF}>
                  <Icon name="phone" />
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BookingSheet options={booking} context={bookingContext} />
      <FloatingCta phone={NATIONAL_PHONE} phoneHref={NATIONAL_PHONE_HREF} email="harold@chimcare.com" quoteHref="#booking" />
    </>
  );
}
