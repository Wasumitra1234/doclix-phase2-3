package com.doclix.autofill;

import java.util.Locale;

final class FieldClassifier {

    private FieldClassifier() {
    }

    static String classify(
            String autofillHints,
            String resourceId,
            String placeholder,
            String webDomain) {

        String all =
                ((autofillHints == null ? "" : autofillHints) + " "
                        + (resourceId == null ? "" : resourceId) + " "
                        + (placeholder == null ? "" : placeholder) + " "
                        + (webDomain == null ? "" : webDomain))
                        .toLowerCase(Locale.ROOT);

        String normalized =
                all.replaceAll("[^a-z0-9]+", "_");

        if (normalized.contains("email")) {
            return "email";
        }

        if (normalized.contains("phone")
                || normalized.contains("mobile")
                || normalized.contains("tel")) {
            return "mobile";
        }

        if (normalized.contains("birth")
                || normalized.contains("dob")) {
            return "dob";
        }

        if (normalized.contains("category")
                || normalized.contains("caste")) {
            return "category";
        }

        if (normalized.contains("full_name")
                || normalized.contains("fullname")) {
            return "full_name";
        }

        if (normalized.contains("middle_name")
                || normalized.contains("middlename")) {
            return "middle_name";
        }

        if (normalized.contains("first_name")
                || normalized.contains("firstname")) {
            return "first_name";
        }

        if (normalized.contains("last_name")
                || normalized.contains("lastname")
                || normalized.contains("surname")) {
            return "last_name";
        }

        return "";
    }
}
