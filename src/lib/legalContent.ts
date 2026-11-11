export const TERMS_VERSION = '2026-11-11-draft-1';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  shortTitle: string;
  intro: string;
  lastUpdated: string;
  version: string;
  sections: LegalSection[];
};

const DRAFT_NOTICE =
  'This is a working draft prepared for legal and operator review. Massager Studio’s registered legal name, registered business address, official legal/privacy contact, retention schedule and confirmed processor list have not yet been supplied. Do not treat this draft as final legal advice or as a representation that a regulator has approved or registered the platform.';

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  'terms-and-conditions': {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    shortTitle: 'Terms',
    intro:
      'These terms explain the rules for using Massager Studio, a Ghana-focused marketplace for professional massage and wellness services. They are written for customers, individual providers and agencies using the public website and booking-request tools.',
    lastUpdated: '11 November 2026',
    version: TERMS_VERSION,
    sections: [
      {
        id: 'acceptance',
        title: 'Introduction and acceptance',
        paragraphs: [
          'These Terms & Conditions (“Terms”) govern access to and use of the Massager Studio website, public profiles, booking-request tools and related services. By creating an account, submitting a booking request, registering a provider or agency profile, or otherwise using the platform, you agree to these Terms.',
          DRAFT_NOTICE,
        ],
      },
      {
        id: 'platform',
        title: 'Platform purpose and services',
        paragraphs: [
          'Massager Studio provides a discovery and booking-request platform for professional massage and wellness services in Ghana. The platform allows customers to find published profiles, review service information and submit requests to providers or agencies.',
          'Unless expressly stated otherwise, Massager Studio is not the massage provider and does not itself perform massage treatments. Providers and agencies are independent businesses or professionals responsible for the services they offer. A profile, badge or listing is not a promise that a particular service will be available.',
        ],
      },
      {
        id: 'eligibility',
        title: 'Customer eligibility',
        paragraphs: [
          'You must be at least 18 years old and legally able to enter into a binding agreement to use the platform. By using the platform, you confirm that the information you provide is accurate and that you will use the platform only for lawful personal or business purposes.',
          'You are responsible for keeping your login details confidential and for activity carried out through your account. Tell us promptly if you believe your account has been accessed without permission.',
        ],
      },
      {
        id: 'customer-accounts',
        title: 'Customer accounts and information',
        paragraphs: [
          'Customers must provide accurate contact details and keep them up to date. You may not impersonate another person, create an account for someone else without authority, or use false contact information.',
          'Account registration may require acceptance of these Terms and acknowledgement of the Privacy Policy. Email confirmation is used as the registration gate. Phone numbers are contact details and are not, by themselves, proof of identity.',
        ],
      },
      {
        id: 'provider-registration',
        title: 'Provider and agency registration',
        paragraphs: [
          'Individual providers and agencies must provide accurate registration, business, service, pricing, location and contact information. Agencies are responsible for ensuring that their team members, listings and service descriptions are accurate and that team members are authorised to be represented on the agency profile.',
          'Registration does not guarantee publication, verification or booking eligibility. Massager Studio may request additional information, review a profile before publication, decline publication, or later restrict a profile where necessary for safety, accuracy or legal compliance.',
          'Provider membership is currently free. Massager Studio does not currently charge the membership fee described in older product material. If a fee is introduced, the applicable price and terms will be shown before any charge is made.',
        ],
      },
      {
        id: 'profile-accuracy',
        title: 'Accurate profile information',
        paragraphs: [
          'Profile names, biographies, photographs, qualifications, services, prices, service areas, availability and contact details must be accurate, current and not misleading. You must have the right to use every photograph and other item you upload.',
          'A provider or agency must promptly correct information that becomes inaccurate and must not use another person’s identity, photographs, business name or credentials without permission.',
        ],
      },
      {
        id: 'verification',
        title: 'Identity verification and Unverified badges',
        paragraphs: [
          'Massager Studio may offer identity review. A “Verified” badge means that the platform has completed its current identity-review process for that profile. It does not guarantee professional competence, licensing, insurance, service quality, criminal-record status or customer safety.',
          'An “Unverified” badge means identity approval has not been completed. An Unverified profile may be published for browsing, but Unverified providers cannot accept bookings through the platform until the required verification is complete. Admin publication does not change a profile’s identity-verification status.',
          'Identity documents and private verification selfies are handled as private records. They are not part of the public profile and must not be uploaded as public gallery images or sent through public social-media links.',
        ],
      },
      {
        id: 'publication',
        title: 'Profile publication and moderation',
        paragraphs: [
          'Publication is an administrative decision, not an identity verification. Massager Studio may publish, unpublish, suspend or remove a profile or listing where it considers this necessary to protect users, comply with the law, address a complaint or maintain the quality of the marketplace.',
          'We may review profiles, images and service descriptions before or after publication. We do not promise that every item will be reviewed before it becomes visible, and we may rely on information supplied by providers and agencies.',
        ],
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp-only direct provider communication',
        paragraphs: [
          'Where a provider or agency enables a direct-contact link, the platform currently uses WhatsApp rather than an in-platform chat service. Selecting that link opens WhatsApp or the WhatsApp website and transfers you to a third-party service.',
          'Massager Studio does not control WhatsApp and does not automatically receive or monitor the contents of WhatsApp conversations. WhatsApp communications are subject to WhatsApp’s own terms and privacy practices. Do not send identity documents, payment credentials or other sensitive information through a public messaging link unless you have independently decided that it is safe and necessary.',
        ],
      },
      {
        id: 'customer-responsibilities',
        title: 'Customer responsibilities',
        bullets: [
          'Provide accurate booking information, including the service, time, location and contact details.',
          'Treat providers, agency staff and other users with respect and communicate honestly about your needs.',
          'Do not request unlawful, sexual, exploitative or unsafe services, and do not pressure a provider to provide services outside the published listing.',
          'Check the provider’s published services, pricing, location and cancellation information before booking.',
          'Do not record, publish or distribute another person’s image, identity document or private information without lawful authority.',
          'Report suspected fraud, harassment, unsafe conduct or inaccurate listings to Massager Studio.',
        ],
      },
      {
        id: 'provider-responsibilities',
        title: 'Provider responsibilities',
        bullets: [
          'Provide lawful professional massage and wellness services that match the published description and price.',
          'Maintain any licence, insurance, training or business registration required for your services, and provide evidence when reasonably requested.',
          'Keep availability, service areas and contact details current.',
          'Communicate clearly about pricing, travel, cancellation, health limitations and any lawful conditions before accepting a booking.',
          'Never ask a customer to bypass identity, safety, payment or booking controls, and never represent an Unverified profile as Verified.',
          'Protect customer information and use it only for the requested service and related legitimate communication.',
        ],
      },
      {
        id: 'agency-responsibilities',
        title: 'Agency and team responsibilities',
        paragraphs: [
          'An agency is responsible for the conduct and representations of its team members on the platform. The agency must ensure that each team member is properly authorised, that the agency can lawfully supply the advertised services, and that the public profile accurately identifies the agency and its team.',
          'Agencies must not add a team member or use a photograph, identity or credential without that person’s authority. Agencies must cooperate with verification, complaints and removal requests.',
        ],
      },
      {
        id: 'services',
        title: 'Service descriptions, prices and availability',
        paragraphs: [
          'Service descriptions, durations and prices are supplied by providers or agencies. Massager Studio may display them but does not independently guarantee that they are complete, available or suitable for a particular customer.',
          'A listing does not create a confirmed appointment. Availability can change, and a provider may need to confirm health, location or service details before accepting a request.',
        ],
      },
      {
        id: 'bookings',
        title: 'Booking and cancellation procedures',
        paragraphs: [
          'A booking request is a request for a provider or agency to consider. It is not a confirmed appointment until the provider or agency accepts it. The platform may record a request as pending review or pending payment while the parties confirm the details.',
          'Cancellation, rescheduling and late-arrival rules must be communicated clearly by the provider or agency and applied consistently. Customers should cancel as early as possible. Nothing in these Terms removes a right that cannot lawfully be excluded under Ghanaian consumer law.',
        ],
      },
      {
        id: 'payments',
        title: 'Payments, fees and refunds',
        paragraphs: [
          'The website does not currently process customer card or mobile-money payments. A booking request may show a quoted total or a pending payment status, but that is not proof that a payment has been taken by Massager Studio.',
          'Unless Massager Studio expressly states otherwise in writing, payment, deposit, refund and chargeback arrangements are between the customer and the provider or agency. Customers should confirm the amount, method, timing and refund conditions before paying anyone.',
          'Provider membership is currently free. No membership fee is charged at present. If Massager Studio introduces a fee, the amount and applicable terms will be displayed before acceptance.',
        ],
      },
      {
        id: 'conduct',
        title: 'Appropriate professional conduct',
        paragraphs: [
          'Everyone using the platform must maintain professional boundaries and respectful conduct. Massage services must be lawful, consensual and provided in a safe environment. Customers must not ask for sexual services or any service that is unlawful or outside the provider’s published offering.',
          'Providers and agencies must not exploit a customer’s vulnerability, use deceptive pricing, threaten or harass a customer, or engage in discrimination prohibited by applicable law.',
        ],
      },
      {
        id: 'prohibited',
        title: 'Prohibited and unlawful activities',
        bullets: [
          'Advertising or arranging sexual services, escort services, trafficking or exploitation.',
          'Using the platform to harm, threaten, stalk, defraud or discriminate against another person.',
          'Impersonation, fake reviews, forged credentials, stolen photographs or misleading identity information.',
          'Uploading malware, attempting to access another account, scraping private data or interfering with platform security.',
          'Publishing another person’s identity document, private selfie, address or contact details without lawful authority.',
          'Using the platform in breach of sanctions, consumer-protection, privacy, health, safety or other applicable law.',
        ],
      },
      {
        id: 'content',
        title: 'User-generated photos, profiles and media',
        paragraphs: [
          'You retain ownership of content you create, but grant Massager Studio a non-exclusive, worldwide licence to host, reproduce, resize, display and moderate that content for operating, promoting and improving the platform. You must have all permissions needed to grant this licence.',
          'We may remove content that is unlawful, misleading, harmful, infringing or inconsistent with these Terms. Removal of a public photo does not necessarily remove a private verification record that we are required or permitted to retain for safety, fraud prevention or legal compliance.',
        ],
      },
      {
        id: 'accounts',
        title: 'Account suspension, blocking and deletion',
        paragraphs: [
          'We may suspend, restrict or block an account or profile where we reasonably believe there is fraud, impersonation, unsafe conduct, a serious complaint, a legal requirement, repeated inaccuracy or a breach of these Terms. Where appropriate, we will explain the reason and any available review path.',
          'You may request deletion of your account. Some records may be retained where necessary to comply with law, resolve disputes, prevent fraud or protect users. Deleting a public profile does not automatically delete private verification or transaction records that must be retained.',
        ],
      },
      {
        id: 'complaints',
        title: 'Complaints and dispute resolution',
        paragraphs: [
          'Contact us first if you have a complaint about a profile, booking, payment, safety issue or another user. Include the relevant profile, booking reference and a factual description so we can investigate.',
          'Massager Studio may help facilitate communication, but it is not a court, arbitrator or emergency service. Providers and customers remain responsible for resolving their own service, payment and conduct disputes. Urgent safety concerns should be reported to the appropriate Ghanaian authorities.',
        ],
      },
      {
        id: 'liability',
        title: 'Platform responsibility and limitations',
        paragraphs: [
          'The platform is provided on an “as available” basis. To the extent permitted by Ghanaian law, Massager Studio is not responsible for the acts, omissions, pricing, quality, safety or availability of independent providers or agencies, or for content supplied by users.',
          'Nothing in these Terms excludes liability for fraud, wilful misconduct, death or personal injury caused by negligence, or any liability that cannot lawfully be excluded. Any limitation must be read subject to your non-excludable rights under applicable law.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to these Terms',
        paragraphs: [
          'We may update these Terms to reflect changes in the platform, law or operations. The updated version will show a new last-updated date and, where appropriate, an in-product notice. Material changes may require a fresh acceptance before continued use.',
          'The version and time of acceptance may be recorded for account and compliance purposes.',
        ],
      },
      {
        id: 'law-contact',
        title: 'Governing law and contact details',
        paragraphs: [
          'These Terms are intended to be governed by the laws of Ghana, subject to any mandatory consumer protections that apply. The courts of Ghana are intended to have jurisdiction, once the operator’s registered details are confirmed.',
          'Operator details still required before final publication: registered legal business name, registered business address, country of registration, official legal contact and confirmed governing jurisdiction. General contact: contact@massagerstudio.com.',
        ],
      },
    ],
  },
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    intro:
      'This Privacy Policy explains how Massager Studio handles personal information when you browse the marketplace, create an account, register as a provider or agency, submit a booking request or contact a provider.',
    lastUpdated: '11 November 2026',
    version: TERMS_VERSION,
    sections: [
      {
        id: 'operator',
        title: 'Who operates Massager Studio',
        paragraphs: [
          'Massager Studio operates the website at massagerstudio.com and the related booking-request tools. The registered legal entity name, registered business address and official privacy contact have not yet been confirmed. Until they are, privacy questions can be sent to contact@massagerstudio.com.',
          DRAFT_NOTICE,
        ],
      },
      {
        id: 'collection',
        title: 'Personal information we collect',
        paragraphs: [
          'We collect information you provide directly, information generated when you use the platform, and limited technical information needed to operate and secure the service. The exact information depends on whether you are a visitor, customer, individual provider or agency.',
        ],
        bullets: [
          'Customer account information: name, email address, phone number, password hash, account role, account status, email-confirmation status and terms-acceptance time.',
          'Individual and agency registration information: business or display name, provider type, gender where supplied for an individual provider, city, region, service areas, services, prices, availability, biography, profile photographs and public-contact preferences.',
          'Identity-verification information: private selfies and government-issued identity-document images submitted for review, together with review status and reviewer notes.',
          'Contact details: email address, phone number and the WhatsApp number or public contact details a provider chooses to display.',
          'Location information: region, city, neighbourhood or service area, and, only when you choose to use the current-location feature, optional GPS coordinates.',
          'Booking and assignment records: requested service, duration, price quote, preferred date and time, location type, notes, status, cancellation or rescheduling information and related account identifiers.',
          'Payment-related information: booking status, quoted amounts and any provider membership or verification status. The website does not currently process customer card payments.',
          'Account and security logs: login and session information, IP address, user agent, rate-limit and security events, audit records and error logs.',
        ],
      },
      {
        id: 'sources',
        title: 'Where information comes from',
        paragraphs: [
          'We receive information from you when you fill in a form, upload a profile or verification image, submit a booking request, contact a provider or communicate with us. We also generate records when you use the platform, such as session, booking and audit records.',
          'Agencies may provide information about their team members. An agency must have authority to provide that information and must ensure the team member understands how it will be used.',
        ],
      },
      {
        id: 'purposes',
        title: 'Why we process personal information',
        bullets: [
          'To create and secure accounts, authenticate users and provide customer, provider and agency workspaces.',
          'To publish and moderate profiles, display services and prices, and operate location-based discovery.',
          'To process booking requests, assignments, rescheduling, cancellations and related communications.',
          'To review identity verification, manage Verified/Unverified status and prevent fraud or impersonation.',
          'To provide customer support, investigate complaints, enforce platform rules and protect users.',
          'To maintain audit, security and operational records, comply with legal obligations and resolve disputes.',
          'To send service messages such as email confirmation, password reset, booking or verification notices. Optional marketing is not enabled by these policies and would require separate consent.',
        ],
      },
      {
        id: 'lawful-bases',
        title: 'Processing justifications',
        paragraphs: [
          'We aim to process personal information in line with Ghana’s Data Protection Act, 2012 (Act 843) and applicable guidance from the Data Protection Commission. Depending on the context, processing may be justified by your consent, the performance of a contract or steps requested before a contract, compliance with a legal obligation, protection of a vital interest, or a legitimate interest that does not override your rights.',
          'Identity verification involves sensitive identity information. We treat it as private and process it for verification, safety and fraud-prevention purposes with appropriate safeguards. Optional GPS collection is not a condition of creating an account or browsing; it is used only when you choose the current-location feature.',
          'Accepting the Terms & Conditions is not blanket consent to marketing, precise GPS collection or unrelated secondary uses. Any optional consent will be requested separately and can be withdrawn.',
        ],
      },
      {
        id: 'public-private',
        title: 'Public and private information',
        paragraphs: [
          'Published provider profiles may display the provider’s display or business name, provider type, city or region, biography, services, prices, availability, public photographs and the business phone, WhatsApp or email contact details the provider chooses to publish. Agency profiles may also display team-member information that the agency has chosen to publish.',
          'Government identity documents, private verification selfies, reviewer notes, account passwords, session tokens, private billing records and security logs are not public profile content. They are restricted to authorised staff and service providers who need them for the purposes described in this policy.',
        ],
      },
      {
        id: 'identity',
        title: 'Selfies and government identity documents',
        paragraphs: [
          'Identity documents and private verification selfies are stored as private files, not as gallery or profile images. Access is limited to authorised staff involved in verification, safety, compliance or technical support, and to processors who need access to operate the storage or platform.',
          'Do not upload identity documents through WhatsApp, public social media or profile galleries. If you send identity information through a third-party messaging service, that service’s privacy practices apply.',
        ],
      },
      {
        id: 'location',
        title: 'Region, city, neighbourhood and optional GPS location',
        paragraphs: [
          'Customers and providers may supply a region, city, neighbourhood or service area. This information helps show relevant providers and location-based search results. A provider’s public service area may be displayed on the profile.',
          'The current-location feature is optional. If you allow your browser to share precise coordinates, the platform may use them to rank nearby providers and may store the resulting location details with your account or request. You can decline or revoke browser location permission. GPS is not required to browse or register.',
        ],
      },
      {
        id: 'sharing',
        title: 'Who can access information',
        paragraphs: [
          'Access is limited by role and operational need. Customers can access their own account and booking information. Providers and agencies can access information needed to manage their profile, team, services and bookings. Authorised staff may access account, profile, booking, verification, complaint and audit information according to their permissions.',
          'We may share information with hosting, database, email, storage and security providers that help operate the platform; with a provider or agency when needed to handle a booking or complaint; with professional advisers, authorities or courts where required by law; and with a successor entity in a lawful reorganisation. We do not sell personal information.',
        ],
      },
      {
        id: 'processors',
        title: 'External service providers and WhatsApp links',
        paragraphs: [
          'The platform uses Hostinger for hosting, database and email infrastructure, and may load fonts from Google Fonts. These providers process limited technical information under their own terms and security controls. A current list of confirmed processors and their locations is still being verified.',
          'When you click a WhatsApp link, you leave Massager Studio and enter a service operated by WhatsApp/Meta. WhatsApp may receive your phone number, device information, IP address, message metadata and the content you choose to send. Massager Studio does not automatically receive or monitor the contents of that conversation. Review WhatsApp’s privacy policy before using it.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies, local storage and analytics',
        paragraphs: [
          'The platform uses a secure, HTTP-only session cookie to keep you signed in and to protect your account. It may use browser storage for essential interface state. These are used to provide the service, not to serve advertising.',
          'We do not currently run advertising or behavioural-analytics tracking scripts. Hosting and security infrastructure may process standard request logs. Third-party pages opened from the site, including WhatsApp and social-media links, have their own cookies and privacy practices.',
        ],
      },
      {
        id: 'retention',
        title: 'Data retention',
        paragraphs: [
          'We retain account, profile, booking and security records for as long as needed to provide the service, meet legal or accounting requirements, resolve disputes, prevent fraud and enforce platform rules. Identity-verification records are kept private and are retained only for as long as needed for verification, safety and legal compliance.',
          'Massager Studio has not yet approved a fixed retention schedule for every record type. Until that schedule is adopted, deletion requests will be assessed against operational, safety and legal needs. We will not keep information indefinitely merely because it is convenient.',
        ],
      },
      {
        id: 'security',
        title: 'Security measures',
        paragraphs: [
          'We use HTTPS, hashed passwords, HTTP-only session cookies, role-based staff permissions, same-origin checks, rate limits, private storage rules and audit logging. Access to private verification records is restricted. These measures reduce risk but no internet service can guarantee absolute security.',
          'You are responsible for protecting your password and devices. Contact us immediately if you suspect unauthorised access.',
        ],
      },
      {
        id: 'rights',
        title: 'Your data rights and requests',
        paragraphs: [
          'Subject to applicable law, you may request access to your personal information, correction of inaccurate information, deletion, restriction of processing, objection to certain processing, or withdrawal of consent where processing relies on consent. You may also ask for a copy of information you provided in a portable format where available.',
          'Send requests to contact@massagerstudio.com with enough information for us to verify your identity. We may need to retain some records for legal, security or dispute-resolution reasons. You may also complain to Ghana’s Data Protection Commission or seek advice from another competent authority.',
        ],
      },
      {
        id: 'children',
        title: 'Children',
        paragraphs: [
          'The platform is intended for adults. We do not knowingly create accounts for children under 18. If you believe a child has provided personal information, contact us so we can investigate and take appropriate action.',
        ],
      },
      {
        id: 'transfers',
        title: 'International transfers',
        paragraphs: [
          'Some hosting, email, font or messaging providers may process information outside Ghana. Where cross-border processing occurs, we intend to use appropriate contractual and organisational safeguards required by applicable law. The confirmed processor list and transfer locations are still being verified.',
        ],
      },
      {
        id: 'changes-contact',
        title: 'Policy changes and contact',
        paragraphs: [
          'We may update this Privacy Policy as the platform or legal requirements change. The latest version will show a new last-updated date. Material changes may require a fresh acknowledgement where appropriate.',
          'Privacy contact: contact@massagerstudio.com. Operator details still required before final publication: registered legal entity name, registered business address, official privacy contact and confirmed retention periods.',
        ],
      },
    ],
  },
  'data-policy': {
    slug: 'data-policy',
    title: 'Data Protection & Handling Policy',
    shortTitle: 'Data Policy',
    intro:
      'This policy describes the practical safeguards Massager Studio uses for personal information. It is a companion to the Privacy Policy and focuses on data categories, access, retention, security and requests.',
    lastUpdated: '11 November 2026',
    version: TERMS_VERSION,
    sections: [
      {
        id: 'scope',
        title: 'Scope and controller role',
        paragraphs: [
          'This policy applies to personal information processed through the Massager Studio website, accounts, provider and agency profiles, identity review, bookings, assignments, support and security logs. Massager Studio acts as the platform operator and data controller for the account and marketplace records it decides how to process.',
          'Providers and agencies may independently control information they collect during a massage service or a WhatsApp conversation. They must comply with their own obligations under Ghana’s Data Protection Act, 2012 (Act 843).',
          DRAFT_NOTICE,
        ],
      },
      {
        id: 'categories',
        title: 'Data categories',
        bullets: [
          'Identity and account data: name, email, phone, password hash, role, status, email-confirmation and terms-acceptance records.',
          'Provider and agency business data: display and business names, provider type, services, prices, availability, service areas, biography and public-contact choices.',
          'Private verification data: government identity-document images, selfies, review status and restricted reviewer notes.',
          'Customer location and booking data: region, city, area, optional GPS, requested service, time, location type, notes, price quote and status.',
          'Communication and support data: contact requests, complaint records, assignment notices and operational correspondence.',
          'Technical and security data: session identifiers, IP address, user agent, rate-limit events, audit entries and error logs.',
        ],
      },
      {
        id: 'purposes',
        title: 'Collection and processing purposes',
        paragraphs: [
          'We collect information to create and secure accounts, publish and moderate lawful profiles, support location-based discovery, process booking requests, verify identity, prevent fraud, provide support, maintain audit records and comply with applicable law.',
          'We do not use private identity documents or verification selfies for advertising, public profile display or unrelated marketing. We do not treat acceptance of the Terms as consent to optional marketing or precise GPS collection.',
        ],
      },
      {
        id: 'minimisation',
        title: 'Data minimisation and accuracy',
        paragraphs: [
          'We aim to collect only information that is relevant to the stated purpose. Required fields are limited to what is needed to create an account, publish a profile, process a request or complete verification. Optional fields should be clearly optional.',
          'Users must keep their information accurate. Staff reviewing profiles, bookings or verification records should correct or flag inaccurate information rather than silently relying on it.',
        ],
      },
      {
        id: 'identity-records',
        title: 'Private identity-verification records',
        paragraphs: [
          'Identity documents and verification selfies are stored outside the public profile and are not returned by public content endpoints. Access requires an authorised staff permission or a processor role needed to operate private storage.',
          'Staff should access a verification record only when reviewing identity, investigating a safety or fraud issue, responding to a lawful request or maintaining the service. Identity records must not be copied into public galleries, ordinary email, chat messages or social-media posts.',
        ],
      },
      {
        id: 'location-protection',
        title: 'Location-data protection',
        paragraphs: [
          'Region, city and service area are used for discovery and may be shown publicly for providers. Precise GPS coordinates are collected only when a user chooses the current-location feature. GPS is not required for registration or general browsing.',
          'Location data should be used for matching, distance estimates, booking logistics and safety review. It should not be repurposed for advertising or sold. Users can decline or revoke browser location permission.',
        ],
      },
      {
        id: 'public-private',
        title: 'Public versus private provider information',
        paragraphs: [
          'Public profile fields may include display or business name, provider type, city or region, biography, services, prices, availability, public photographs and the business contact details the provider chooses to publish. Public fields must not include identity documents, private selfies, passwords, session tokens or internal reviewer notes.',
          'A provider’s decision to publish a business contact detail does not make unrelated account data public. Agencies must not publish a team member’s private contact information without authority.',
        ],
      },
      {
        id: 'access',
        title: 'Customer, agency and staff access',
        paragraphs: [
          'Customers can access their own account, location and booking information. Providers and agencies can access the profile, team, service and booking information needed to operate their business. Access is limited by account role and ownership checks.',
          'Staff access is role-based. Support, content, verification, privacy and administrative permissions are separated so that staff see only the information needed for their duties. Audit records capture significant administrative actions.',
        ],
      },
      {
        id: 'retention',
        title: 'Retention and deletion',
        paragraphs: [
          'We retain personal information only for as long as needed for the purposes described in the Privacy Policy, including legal, accounting, fraud-prevention, safety and dispute-resolution needs. Public profiles may be unpublished or removed while limited private records are retained where necessary.',
          'Account deletion requests are assessed against those needs. Where a record must be retained, access should be restricted and the record should not continue to be used for general marketplace purposes. A detailed retention schedule by record type is still pending approval.',
        ],
      },
      {
        id: 'security',
        title: 'Security safeguards',
        bullets: [
          'HTTPS for browser-to-server traffic, with secure and HTTP-only session cookies in production.',
          'Password hashing rather than storage of plaintext passwords.',
          'Role-based staff permissions and ownership checks for account, booking and provider data.',
          'Same-origin checks for administrative writes, rate limits and audit logging.',
          'Private storage rules for identity documents, verification selfies, mail logs and runtime records.',
          'Build-time exclusion of local configuration and runtime storage from the deployed public bundle.',
        ],
      },
      {
        id: 'processors',
        title: 'Service providers and processors',
        paragraphs: [
          'Hostinger provides hosting, database and email infrastructure. Google Fonts may be loaded by the public site. WhatsApp/Meta handles communications when a user opens a WhatsApp link. These providers may process limited technical or contact information under their own terms.',
          'Processors should be bound by confidentiality and security obligations appropriate to the data they handle. The confirmed processor list, data locations and contract details are being verified before the policy is finalised.',
        ],
      },
      {
        id: 'transfers',
        title: 'Cross-border transfers',
        paragraphs: [
          'Some service providers may store or process information outside Ghana. Where that occurs, Massager Studio intends to use appropriate safeguards required by Act 843 and applicable guidance, and to limit transfers to what is necessary for the service.',
          'The final policy will identify confirmed transfer destinations and safeguards. This draft does not assert that a particular adequacy decision, registration or certification exists.',
        ],
      },
      {
        id: 'requests',
        title: 'Access, correction, export and deletion requests',
        paragraphs: [
          'Requests can be sent to contact@massagerstudio.com. We may ask for information needed to verify identity and locate the relevant records. We will respond within the period required by applicable law.',
          'Where a request cannot be fully granted, we will explain the legal or operational reason where appropriate. A request to delete a public profile does not automatically erase records that must be retained for legal, security or dispute-resolution purposes.',
        ],
      },
      {
        id: 'incidents',
        title: 'Incident and breach handling',
        paragraphs: [
          'Suspected data incidents should be reported immediately to contact@massagerstudio.com. The team should contain the incident, preserve evidence, assess affected records and users, restrict further access, and document the response.',
          'Where applicable law requires notification to the Data Protection Commission or affected individuals, Massager Studio will make the notification without undue delay and will not hide a confirmed breach. This draft does not promise a notification outcome before the facts are known.',
        ],
      },
      {
        id: 'updates',
        title: 'Policy updates and governance',
        paragraphs: [
          'This policy will be reviewed when the platform, processors, legal requirements or retention practices change. Material updates will show a new last-updated date and may require a fresh acknowledgement where appropriate.',
          'Before final publication, Massager Studio must confirm its registered legal name, business address, official privacy contact, retention schedule, processor list and cross-border transfer arrangements. Until then, this document remains a draft for review.',
        ],
      },
    ],
  },
};

export const LEGAL_DOCUMENT_LIST = Object.values(LEGAL_DOCUMENTS);

export function getLegalDocument(slug: string): LegalDocument | null {
  return LEGAL_DOCUMENTS[slug] ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** HTML used when an administrator creates the initial CMS draft. */
export function legalDraftHtml(document: LegalDocument): string {
  const sections = document.sections
    .map((section, index) => {
      const paragraphs = (section.paragraphs ?? [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('');
      const bullets = section.bullets?.length
        ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
      return `<h2 id="${escapeHtml(section.id)}">${String(index + 1).padStart(2, '0')}. ${escapeHtml(section.title)}</h2>${paragraphs}${bullets}`;
    })
    .join('');
  return `<p><strong>Draft for legal review.</strong> ${escapeHtml(DRAFT_NOTICE)}</p>${sections}`;
}
