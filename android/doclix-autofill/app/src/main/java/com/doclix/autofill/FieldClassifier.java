package com.doclix.autofill;

import java.util.Locale;

final class FieldClassifier {

    private FieldClassifier() {
    }

    static String classify(
            String autofillHints,
            String resourceId,
            String placeholder,
            String text,
            String htmlAttributes,
            String webDomain) {

        String all = join(
                autofillHints,
                resourceId,
                placeholder,
                text,
                htmlAttributes,
                webDomain);

        String normalized = all
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_");

        // Safety rule: never autofill shared/emergency/alternate contact fields
        // from the primary mobile number.
        if (containsAny(normalized,
                "emergency",
                "alternate_mobile",
                "alternate_phone",
                "whatsapp")) {
            return "";
        }

        // Email must win before name heuristics. This covers both primary and
        // confirmation email fields and HTML attributes such as type=email.
        if (containsAny(normalized,
                "email",
                "e_mail",
                "emailaddress",
                "confirmemail",
                "confirm_email")) {
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
