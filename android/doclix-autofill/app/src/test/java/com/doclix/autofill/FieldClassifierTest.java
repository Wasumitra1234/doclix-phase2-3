package com.doclix.autofill;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class FieldClassifierTest {

    @Test
    public void digiALMNameLabelsAreMappedExactly() {
        assertEquals(
                "first_name",
                FieldClassifier.classify(
                        "",
                        "",
                        "Candidate First Name",
                        "digialm.com"));

        assertEquals(
                "middle_name",
                FieldClassifier.classify(
                        "",
                        "",
                        "Candidate Middle Name",
                        "digialm.com"));

        assertEquals(
                "last_name",
                FieldClassifier.classify(
                        "",
                        "",
                        "Candidate Last Name",
                        "digialm.com"));

        assertEquals(
                "full_name",
                FieldClassifier.classify(
                        "",
                        "",
                        "Candidate Full Name",
                        "digialm.com"));
    }

    @Test
    public void otherDataCardFieldsMapCorrectly() {
        assertEquals(
                "email",
                FieldClassifier.classify(
                        "emailAddress",
                        "",
                        "Email",
                        "digialm.com"));

        assertEquals(
                "mobile",
                FieldClassifier.classify(
                        "",
                        "candidateMobile",
                        "Mobile Number",
                        "digialm.com"));

        assertEquals(
                "dob",
                FieldClassifier.classify(
                        "",
                        "candidateDOB",
                        "Date of Birth",
                        "digialm.com"));

        assertEquals(
                "category",
                FieldClassifier.classify(
                        "",
                        "candidateCategory",
                        "Category",
                        "digialm.com"));
    }

    @Test
    public void unknownFieldDoesNotGuess() {
        assertEquals(
                "",
                FieldClassifier.classify(
                        "",
                        "randomField",
                        "Candidate Address",
                        "digialm.com"));
    }
}
