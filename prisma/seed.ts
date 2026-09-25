/**
 * Phase 1 Seed Data
 * - 3 Subscription Plans
 * - 5 Sample Templates (with versions + form schemas)
 * - Demo tenant + admin user (optional for local dev)
 *
 * Run: npx prisma db seed
 */

import { PrismaClient, PlanInterval, IndianState, Language, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Phase 1 data...");

  // ---------------------------------------------------------------------------
  // 1. Plans
  // ---------------------------------------------------------------------------
  const starter = await prisma.plan.upsert({
    where: { code: "STARTER" },
    update: {},
    create: {
      code: "STARTER",
      name: "Starter",
      description: "For individual typists and small chambers. Up to 50 documents/month.",
      interval: PlanInterval.MONTHLY,
      priceInPaise: 49900,
      currency: "INR",
      documentsLimit: 50,
      storageLimitMb: 512,
      ocrPagesLimit: 100,
      aiTokensLimit: 50000,
      features: {
        customTemplates: false,
        multiUser: false,
        prioritySupport: false,
        apiAccess: false,
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  const pro = await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {},
    create: {
      code: "PRO",
      name: "Professional",
      description: "For advocates and stamp vendors. Up to 300 documents/month + multi-user.",
      interval: PlanInterval.MONTHLY,
      priceInPaise: 149900,
      currency: "INR",
      documentsLimit: 300,
      storageLimitMb: 5120,
      ocrPagesLimit: 1000,
      aiTokensLimit: 500000,
      features: {
        customTemplates: true,
        multiUser: true,
        prioritySupport: true,
        apiAccess: false,
      },
      isActive: true,
      sortOrder: 2,
    },
  });

  const enterprise = await prisma.plan.upsert({
    where: { code: "ENTERPRISE" },
    update: {},
    create: {
      code: "ENTERPRISE",
      name: "Enterprise",
      description: "Unlimited documents, dedicated support, custom integrations. Yearly billing.",
      interval: PlanInterval.YEARLY,
      priceInPaise: 1499900,
      currency: "INR",
      documentsLimit: -1,
      storageLimitMb: 51200,
      ocrPagesLimit: -1,
      aiTokensLimit: -1,
      features: {
        customTemplates: true,
        multiUser: true,
        prioritySupport: true,
        apiAccess: true,
        whiteLabel: true,
        sso: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log("Plans:", starter.code, pro.code, enterprise.code);

  // ---------------------------------------------------------------------------
  // 2. Sample Templates (system templates – tenantId = null)
  // ---------------------------------------------------------------------------

  async function createSystemTemplate(opts: {
    code: string;
    name: string;
    description: string;
    category: string;
    state: IndianState;
    language: Language;
    bodyContent: string;
    formSchema: object;
    uiSchema?: object;
    fieldMeta?: object;
    stampPaperTopClearanceMm?: number;
    clauseRefs?: object;
  }) {
    const form = await prisma.formSchema.create({
      data: {
        name: `${opts.code}_v1_form`,
        jsonSchema: opts.formSchema,
        uiSchema: opts.uiSchema ?? {},
        fieldMeta: opts.fieldMeta ?? {},
        version: 1,
      },
    });

    const template = await prisma.template.create({
      data: {
        tenantId: null,
        code: opts.code,
        name: opts.name,
        description: opts.description,
        category: opts.category,
        state: opts.state,
        language: opts.language,
        isActive: true,
        isSystem: true,
        tags: [opts.category.toLowerCase(), opts.state, opts.language],
        metadata: {
          requiresWitness: true,
          note: "Sample template for Phase 1 – not legal advice",
        },
      },
    });

    const version = await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        name: `${opts.name} v1`,
        isPublished: true,
        publishedAt: new Date(),
        pageSize: "A4",
        orientation: "portrait",
        marginTopMm: 20,
        marginBottomMm: 20,
        marginLeftMm: 25,
        marginRightMm: 20,
        stampPaperTopClearanceMm: opts.stampPaperTopClearanceMm ?? 45,
        defaultFontFamily: "Times New Roman",
        defaultFontSizePt: 12,
        headingFontFamily: "Times New Roman",
        headingFontSizePt: 14,
        bodyContent: opts.bodyContent,
        clauseRefs: opts.clauseRefs ?? [],
        headerContent: null,
        footerContent: "Page {{page}} of {{totalPages}}",
        formSchemaId: form.id,
        snapshot: {
          code: opts.code,
          name: opts.name,
          state: opts.state,
          language: opts.language,
          formSchemaId: form.id,
        },
      },
    });

    await prisma.template.update({
      where: { id: template.id },
      data: { currentVersionId: version.id },
    });

    return { template, version, form };
  }

  // Template 1: Affidavit
  await createSystemTemplate({
    code: "AFFIDAVIT_GENERAL",
    name: "General Affidavit",
    description: "Simple general-purpose affidavit template suitable for most states.",
    category: "Affidavit",
    state: IndianState.ALL,
    language: Language.EN,
    stampPaperTopClearanceMm: 50,
    bodyContent: `
<div style="text-align:center; font-weight:bold; margin-bottom:24px;">
  AFFIDAVIT
</div>
<p>I, <strong>{{deponent_name}}</strong>, aged about {{deponent_age}} years, 
son/daughter/wife of {{deponent_father_or_spouse}}, residing at {{deponent_address}}, 
do hereby solemnly affirm and state as under:</p>

<ol>
  <li>{{statement_1}}</li>
  <li>{{statement_2}}</li>
  <li>{{statement_3}}</li>
</ol>

<p>I am swearing this affidavit to {{purpose}}.</p>

<p>The contents of this affidavit are true and correct to the best of my knowledge 
and belief and nothing material has been concealed therefrom.</p>

<p style="margin-top:40px;">Place: {{place}}<br/>Date: {{date}}</p>

<p style="margin-top:60px; text-align:right;">
  _________________________<br/>
  Deponent
</p>
    `.trim(),
    formSchema: {
      type: "object",
      required: ["deponent_name", "deponent_age", "deponent_address", "purpose", "place", "date"],
      properties: {
        deponent_name: { type: "string", title: "Deponent Full Name", minLength: 2 },
        deponent_age: { type: "integer", title: "Age", minimum: 18, maximum: 120 },
        deponent_father_or_spouse: { type: "string", title: "Father / Spouse Name" },
        deponent_address: { type: "string", title: "Full Residential Address" },
        statement_1: { type: "string", title: "Statement 1" },
        statement_2: { type: "string", title: "Statement 2" },
        statement_3: { type: "string", title: "Statement 3" },
        purpose: { type: "string", title: "Purpose of Affidavit" },
        place: { type: "string", title: "Place" },
        date: { type: "string", format: "date", title: "Date" },
      },
    },
    uiSchema: {
      deponent_address: { "ui:widget": "textarea" },
      statement_1: { "ui:widget": "textarea" },
      statement_2: { "ui:widget": "textarea" },
      statement_3: { "ui:widget": "textarea" },
    },
  });

  // Template 2: POA Maharashtra
  await createSystemTemplate({
    code: "POA_GENERAL_MH",
    name: "General Power of Attorney (Maharashtra)",
    description: "General Power of Attorney template for use in Maharashtra.",
    category: "Power of Attorney",
    state: IndianState.MH,
    language: Language.EN,
    stampPaperTopClearanceMm: 55,
    bodyContent: `
<div style="text-align:center; font-weight:bold;">GENERAL POWER OF ATTORNEY</div>
<p>KNOW ALL MEN BY THESE PRESENTS that I, <strong>{{principal_name}}</strong>, 
aged {{principal_age}} years, residing at {{principal_address}} 
(hereinafter called the "Principal") do hereby nominate, constitute and appoint 
<strong>{{attorney_name}}</strong>, aged {{attorney_age}} years, residing at 
{{attorney_address}} (hereinafter called the "Attorney") as my true and lawful 
Attorney to do the following acts, deeds and things in my name and on my behalf:</p>

<ol>
  <li>{{power_1}}</li>
  <li>{{power_2}}</li>
  <li>{{power_3}}</li>
</ol>

<p>AND I hereby agree to ratify and confirm all that the said Attorney shall lawfully 
do or cause to be done by virtue of these presents.</p>

<p>IN WITNESS WHEREOF I have hereunto set my hand on this {{date}} at {{place}}.</p>

<p style="margin-top:50px;">_________________________<br/>Principal</p>
<p style="margin-top:30px;">Witnesses:</p>
<p>1. {{witness1_name}} – {{witness1_address}}</p>
<p>2. {{witness2_name}} – {{witness2_address}}</p>
    `.trim(),
    formSchema: {
      type: "object",
      required: ["principal_name", "principal_address", "attorney_name", "attorney_address", "date", "place"],
      properties: {
        principal_name: { type: "string", title: "Principal Full Name" },
        principal_age: { type: "integer", title: "Principal Age", minimum: 18 },
        principal_address: { type: "string", title: "Principal Address" },
        attorney_name: { type: "string", title: "Attorney Full Name" },
        attorney_age: { type: "integer", title: "Attorney Age", minimum: 18 },
        attorney_address: { type: "string", title: "Attorney Address" },
        power_1: { type: "string", title: "Power / Authority 1" },
        power_2: { type: "string", title: "Power / Authority 2" },
        power_3: { type: "string", title: "Power / Authority 3" },
        date: { type: "string", format: "date", title: "Date of Execution" },
        place: { type: "string", title: "Place of Execution" },
        witness1_name: { type: "string", title: "Witness 1 Name" },
        witness1_address: { type: "string", title: "Witness 1 Address" },
        witness2_name: { type: "string", title: "Witness 2 Name" },
        witness2_address: { type: "string", title: "Witness 2 Address" },
      },
    },
  });

  // Template 3: Rental Agreement Delhi
  await createSystemTemplate({
    code: "RENTAL_AGREEMENT_DL",
    name: "Residential Rental Agreement (Delhi)",
    description: "Simple residential leave and license / rental agreement template for Delhi NCR.",
    category: "Agreement",
    state: IndianState.DL,
    language: Language.EN,
    stampPaperTopClearanceMm: 45,
    bodyContent: `
<div style="text-align:center; font-weight:bold;">RENTAL AGREEMENT</div>
<p>This Agreement is made on {{agreement_date}} between:</p>
<p><strong>Landlord:</strong> {{landlord_name}}, residing at {{landlord_address}}</p>
<p><strong>Tenant:</strong> {{tenant_name}}, residing at {{tenant_address}}</p>

<p>The Landlord hereby lets and the Tenant takes on rent the premises situated at 
<strong>{{property_address}}</strong> for a period of {{tenancy_months}} months 
commencing from {{start_date}} on the following terms:</p>

<ol>
  <li>Monthly rent: Rs {{monthly_rent}} payable on or before the {{rent_due_day}} of each month.</li>
  <li>Security deposit: Rs {{security_deposit}} (refundable).</li>
  <li>{{additional_terms}}</li>
</ol>

<p>IN WITNESS WHEREOF the parties have signed this Agreement on the date first above written.</p>
<p style="margin-top:40px;">_________________ &nbsp;&nbsp;&nbsp; _________________</p>
<p>Landlord &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Tenant</p>
    `.trim(),
    formSchema: {
      type: "object",
      required: [
        "landlord_name", "landlord_address", "tenant_name", "tenant_address",
        "property_address", "monthly_rent", "security_deposit", "start_date", "agreement_date"
      ],
      properties: {
        landlord_name: { type: "string", title: "Landlord Name" },
        landlord_address: { type: "string", title: "Landlord Address" },
        tenant_name: { type: "string", title: "Tenant Name" },
        tenant_address: { type: "string", title: "Tenant Current Address" },
        property_address: { type: "string", title: "Property Address (to be rented)" },
        tenancy_months: { type: "integer", title: "Tenancy Period (months)", minimum: 1, default: 11 },
        start_date: { type: "string", format: "date", title: "Tenancy Start Date" },
        monthly_rent: { type: "number", title: "Monthly Rent (Rs)", minimum: 1 },
        rent_due_day: { type: "integer", title: "Rent Due Day of Month", minimum: 1, maximum: 28, default: 5 },
        security_deposit: { type: "number", title: "Security Deposit (Rs)", minimum: 0 },
        additional_terms: { type: "string", title: "Additional Terms" },
        agreement_date: { type: "string", format: "date", title: "Agreement Date" },
      },
    },
  });

  // Template 4: Sale Agreement Karnataka
  await createSystemTemplate({
    code: "SALE_AGREEMENT_KA",
    name: "Agreement for Sale (Karnataka)",
    description: "Agreement for Sale of immovable property – sample structure for Karnataka.",
    category: "Conveyance",
    state: IndianState.KA,
    language: Language.EN,
    stampPaperTopClearanceMm: 50,
    bodyContent: `
<div style="text-align:center; font-weight:bold;">AGREEMENT FOR SALE</div>
<p>This Agreement for Sale is made on {{agreement_date}} BETWEEN:</p>
<p><strong>Seller:</strong> {{seller_name}}, residing at {{seller_address}}</p>
<p><strong>Purchaser:</strong> {{purchaser_name}}, residing at {{purchaser_address}}</p>

<p>WHEREAS the Seller is the absolute owner of the property described in the Schedule 
below and has agreed to sell the same to the Purchaser for a total consideration of 
Rs {{total_consideration}}.</p>

<p><strong>SCHEDULE OF PROPERTY</strong></p>
<p>{{property_description}}</p>

<p>The parties agree as follows:</p>
<ol>
  <li>The Purchaser has paid Rs {{advance_amount}} as advance on this day.</li>
  <li>Balance of Rs {{balance_amount}} shall be paid on or before {{balance_due_date}}.</li>
  <li>Sale deed shall be executed on or before {{sale_deed_date}}.</li>
  <li>{{other_terms}}</li>
</ol>

<p>IN WITNESS WHEREOF the parties have signed this Agreement.</p>
<p>Seller: _________________ &nbsp;&nbsp; Purchaser: _________________</p>
    `.trim(),
    formSchema: {
      type: "object",
      required: [
        "seller_name", "seller_address", "purchaser_name", "purchaser_address",
        "property_description", "total_consideration", "advance_amount", "agreement_date"
      ],
      properties: {
        seller_name: { type: "string", title: "Seller Name" },
        seller_address: { type: "string", title: "Seller Address" },
        purchaser_name: { type: "string", title: "Purchaser Name" },
        purchaser_address: { type: "string", title: "Purchaser Address" },
        property_description: { type: "string", title: "Full Property Description / Schedule" },
        total_consideration: { type: "number", title: "Total Sale Consideration (Rs)", minimum: 1 },
        advance_amount: { type: "number", title: "Advance Paid (Rs)", minimum: 0 },
        balance_amount: { type: "number", title: "Balance Amount (Rs)" },
        balance_due_date: { type: "string", format: "date", title: "Balance Due Date" },
        sale_deed_date: { type: "string", format: "date", title: "Expected Sale Deed Date" },
        other_terms: { type: "string", title: "Other Terms & Conditions" },
        agreement_date: { type: "string", format: "date", title: "Agreement Date" },
      },
    },
    uiSchema: {
      property_description: { "ui:widget": "textarea", "ui:options": { rows: 6 } },
      other_terms: { "ui:widget": "textarea" },
    },
  });

  // Template 5: Indemnity Bond
  await createSystemTemplate({
    code: "INDEMNITY_BOND_GENERAL",
    name: "Indemnity Bond",
    description: "General indemnity bond template.",
    category: "Bond",
    state: IndianState.ALL,
    language: Language.EN,
    stampPaperTopClearanceMm: 45,
    bodyContent: `
<div style="text-align:center; font-weight:bold;">INDEMNITY BOND</div>
<p>I, <strong>{{indemnifier_name}}</strong>, aged {{indemnifier_age}} years, 
residing at {{indemnifier_address}} (hereinafter the "Indemnifier") hereby 
undertake to indemnify and keep indemnified <strong>{{beneficiary_name}}</strong> 
against any loss, damage, claim or demand arising out of {{subject_matter}}.</p>

<p>This bond is executed on {{bond_date}} at {{place}}.</p>

<p style="margin-top:50px;">_________________________<br/>Indemnifier</p>
<p style="margin-top:30px;">Witness: {{witness_name}}</p>
    `.trim(),
    formSchema: {
      type: "object",
      required: ["indemnifier_name", "indemnifier_address", "beneficiary_name", "subject_matter", "bond_date", "place"],
      properties: {
        indemnifier_name: { type: "string", title: "Indemnifier Name" },
        indemnifier_age: { type: "integer", title: "Age", minimum: 18 },
        indemnifier_address: { type: "string", title: "Indemnifier Address" },
        beneficiary_name: { type: "string", title: "Beneficiary Name" },
        subject_matter: { type: "string", title: "Subject Matter / Reason for Indemnity" },
        bond_date: { type: "string", format: "date", title: "Date of Bond" },
        place: { type: "string", title: "Place" },
        witness_name: { type: "string", title: "Witness Name" },
      },
    },
  });

  console.log("5 system templates created");

  // ---------------------------------------------------------------------------
  // 3. Demo tenant (local development)
  // ---------------------------------------------------------------------------
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo-chambers" },
    update: {},
    create: {
      name: "Demo Legal Chambers",
      slug: "demo-chambers",
      email: "admin@demo-chambers.local",
      phone: "+919999999999",
      state: IndianState.MH,
      city: "Mumbai",
      isActive: true,
      settings: {
        defaultLanguage: "EN",
        defaultState: "MH",
        stampPaperPreferred: true,
      },
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: demoTenant.id,
        email: "admin@demo-chambers.local",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "admin@demo-chambers.local",
      firstName: "Demo",
      lastName: "Admin",
      role: Role.VENDOR_ADMIN,
      isActive: true,
      passwordHash: "$2b$10$placeholderhashfortestingonly",
    },
  });

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  await prisma.subscription.create({
    data: {
      tenantId: demoTenant.id,
      planId: pro.id,
      status: "TRIALING",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
  });

  console.log("Demo tenant + admin + trial subscription created");
  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
