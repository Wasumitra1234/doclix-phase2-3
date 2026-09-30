package com.doclix.autofill;

import android.text.InputType;

import java.util.Locale;

final class FieldClassifier {

    private FieldClassifier() {}

    static String classify(
            String autofillHints,
            String resourceId,
            String placeholder,
            String contentDescription,
            String htmlAttributes,
            int inputType) {

        // Priority 0: safety guardrail. Run before every positive classifier.
        String merged = join(
                resourceId,
                placeholder,
                contentDescription,
                htmlAttributes);

        if (isAuxiliaryContact(merged)) {
            return "";
        }

        // Priority 1: Android Autofill hints.
        String result = classifyHints(autofillHints);
        if (!result.isEmpty()) {
            return result;
        }

        // Priority 2: standard UI metadata.
        result = classifyText(resourceId, placeholder, contentDescription);
        if (!result.isEmpty()) {
            return result;
        }

        // Priority 3: HTML metadata.
        result = classifyText(htmlAttributes);
        if (!result.isEmpty()) {
            return result;
        }

        // Priority 4: explicit Android email input-type variation.
        int variation = inputType & InputType.TYPE_MASK_VARIATION;
        if (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
                || variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS) {
            return "email";
        }

        return "";
    }

    private static String classifyHints(String hints) {
        String normalized = normalize(hints);

        if (containsAny(normalized, "emailaddress", "email_address")) {
            return "email";
        }
        if (containsAny(normalized, "phone", "phonenumber", "phone_number")) {
            return "mobile";
        }
        if (containsAny(normalized, "persongivenname", "person_given_name")) {
            return "first_name";
        }
        if (containsAny(normalized, "personmiddlename", "person_middle_name")) {
            return "middle_name";
        }
        if (containsAny(normalized, "personfamilyname", "person_family_name")) {
            return "last_name";
        }
        if (containsAny(normalized, "personname", "name")) {
            return "full_name";
        }

        return "";
    }

    private static String classifyText(String... values) {
        String normalized = normalize(join(values));

        // Email before generic/name/mobile heuristics.
        if (containsAny(
                normalized,
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

        if (containsAny(
                normalized,
                "mobile",
                "phone",
                "telephone",
                "tel",
                "confirmmobile",
                "confirm_mobile")) {
            return "mobile";
        }

        if (containsAny(
                normalized,
                "dateofbirth",
                "date_of_birth",
                "birthdate",
                "birth_date",
                "dob")) {
            return "dob";
        }

        if (containsAny(normalized, "category", "caste")) {
            return "category";
        }

        if (containsAny(
                normalized,
                "candidatefullname",
                "candidate_full_name",
                "full_name",
                "fullname")) {
            return "full_name";
        }

        if (containsAny(
                normalized,
                "candidatemiddlename",
                "candidate_middle_name",
                "middle_name",
                "middlename")) {
            return "middle_name";
        }

        if (containsAny(
                normalized,
                "candidatefirstname",
                "candidate_first_name",
                "first_name",
                "firstname")) {
            return "first_name";
        }

        if (containsAny(
                normalized,
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

        return containsAny(
                normalized,
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

        return value.toLowerCase(Locale.ROOT)
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
