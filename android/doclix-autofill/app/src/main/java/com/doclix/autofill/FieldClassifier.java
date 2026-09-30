package com.doclix.autofill;

import android.text.InputType;

import java.util.Locale;

final class FieldClassifier {

    private FieldClassifier() {
    }

    /*
     * Deterministic priority:
     *   0) hard safety exclusions from semantic metadata / HTML
     *   1) Android autofill hints
     *   2) resource id / hint / content-description
     *   3) HTML attributes
     *   4) explicit email inputType fallback
     *
     * Current text value is intentionally NOT used for classification.
     */
    static String classify(
            String autofillHints,
            String resourceId,
            String placeholder,
            String contentDescription,
            String htmlAttributes,
            int inputType) {

        String semanticMetadata = join(
                resourceId,
                placeholder,
                contentDescription,
                htmlAttributes);

        // Hard guardrails must run before any positive hint. A WhatsApp /
        // alternate / emergency field must never inherit the primary mobile
        // Data Card value merely because the browser reports a phone hint.
        if (isAuxiliaryContact(semanticMetadata)) {
            return "";
        }

        // 1. Android Autofill hints.
        String byHint = classifyHints(autofillHints);
        if (!byHint.isEmpty()) {
            return byHint;
        }

        // 2. resource id / hint / content-description.
        String bySemanticMetadata = classifyText(resourceId, placeholder, contentDescription);
        if (!bySemanticMetadata.isEmpty()) {
            return bySemanticMetadata;
        }

        // 3. HTML metadata (name, id, type, placeholder, title, etc.).
        String byHtml = classifyText(htmlAttributes);
        if (!byHtml.isEmpty()) {
            return byHtml;
        }

        // 4. Last-resort email signal. Chrome/WebView may expose the HTML
        // <input type="email"> semantics through InputType even when labels
        // and HtmlInfo attributes are sparse.
        int variation = inputType & InputType.TYPE_MASK_VARIATION;
        if (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
                || variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS) {
            return "email";
        }

        return "";
    }

    private static String classifyHints(String hints) {
        String normalized = normalize(hints);

        if (containsAny(normalized,
                "emailaddress",
                "email_address")) {
            return "email";
        }

        if (containsAny(normalized,
                "phone",
                "phonenumber",
                "phone_number")) {
            return "mobile";
        }

        if (containsAny(normalized,
                "persongivenname",
                "person_given_name")) {
            return "first_name";
        }

        if (containsAny(normalized,
                "personmiddlename",
                "person_middle_name")) {
            return "middle_name";
        }

        if (containsAny(normalized,
                "personfamilyname",
                "person_family_name")) {
            return "last_name";
        }

        if (containsAny(normalized,
                "personname",
                "name")) {
            return "full_name";
        }

        return "";
    }

    private static String classifyText(String... values) {
        String normalized = normalize(join(values));

        // Email must be checked before name / generic text keys.
        if (containsAny(normalized,
                "confirm_email_id",
                "confirm_email",
                "confirmemailid",
                "confirmemail",
                "email_id",
                "emailaddress",
                "email_address",
                "e_mail",
                "email")) {
            return "email";
        }

        if (containsAny(normalized,
                "mobile",
                "phone",
                "telephone",
                "tel",
                "confirmmobile",
                "confirm_mobile")) {
            return "mobile";
        }

        if (containsAny(normalized,
                "dateofbirth",
                "date_of_birth",
                "birthdate",
                "birth_date",
                "dob")) {
            return "dob";
        }

        if (containsAny(normalized,
                "category",
                "caste")) {
            return "category";
        }

        if (containsAny(normalized,
                "candidatefullname",
                "candidate_full_name",
                "full_name",
                "fullname")) {
            return "full_name";
        }

        if (containsAny(normalized,
                "candidatemiddlename",
                "candidate_middle_name",
                "middle_name",
                "middlename")) {
            return "middle_name";
        }

        if (containsAny(normalized,
                "candidatefirstname",
                "candidate_first_name",
                "first_name",
                "firstname")) {
            return "first_name";
        }

        if (containsAny(normalized,
                "candidatelastname",
                "candidate_last_name",
                "last_name",
                "lastname",
                "surname")) {
            return "last_name";
        }

        return "";
    }

    private static boolean isAuxiliaryContact(String values) {
        String normalized = normalize(values);

        return containsAny(normalized,
                "whatsapp",
                "whatsapp_no",
                "whatsapp_number",
                "alternate_mobile",
                "alternate_phone",
                "alternate_number",
                "emergency_contact",
                "emergency_mobile",
                "emergency_phone",
                "emergency_number",
                "alternate_email",
                "secondary_email",
                "backup_email",
                "emergency_email");
    }

    private static String normalize(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }

        return value
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_");
    }

    private static String join(String... values) {
        StringBuilder out = new StringBuilder();

        for (String value : values) {
            if (value != null && !value.isEmpty()) {
                out.append(' ').append(value);
            }
        }

        return out.toString();
    }

    private static boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
