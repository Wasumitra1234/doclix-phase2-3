package com.doclix.autofill;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class FieldClassifierTest {

    private String c(
            String hints,
            String id,
            String placeholder,
            String text,
            String html) {
        return FieldClassifier.classify(
                hints, id, placeholder, text, html, "digialm.com");
    }

    @Test
    public void digiALMNameLabelsAreMappedExactly() {
        assertEquals("first_name",
                c("", "", "Candidate First Name", "", ""));
        assertEquals("middle_name",
                c("", "", "Candidate Middle Name", "", ""));
        assertEquals("last_name",
                c("", "", "Candidate Last Name", "", ""));
        assertEquals("full_name",
                c("", "", "Candidate Full Name", "", ""));
    }

    @Test
    public void digiALMRealisticEmailFieldsAlwaysMapToEmail() {
        assertEquals("email",
                c("", "email", "abc@gmail.com", "", "type=email name=email"));
        assertEquals("email",
                c("emailAddress", "confirmEmail", "Confirm Email ID", "", "type=email"));
        assertEquals("email",
                c("", "emailId", "Email ID", "", "type=email"));
    }

    @Test
    public void digiALMRealisticMobileFieldsMapOnlyPrimaryOrConfirmMobile() {
        assertEquals("mobile",
                c("", "mobile", "Mobile Number", "", "type=tel"));
        assertEquals("mobile",
                c("", "confirmMobile", "Confirm Mobile No", "", "type=tel"));
    }

    @Test
    public void emergencyAndWhatsappNeverGuessPrimaryMobile() {
        assertEquals("",
                c("", "emergencyContactMobile", "Emergency Contact Mobile Number", "", "type=tel"));
        assertEquals("",
                c("", "whatsappNumber", "WhatsApp Number (Optional)", "", "type=tel"));
        assertEquals("",
                c("", "alternateMobile", "Alternate Mobile Number", "", "type=tel"));
    }

    @Test
    public void otherDataCardFieldsMapCorrectly() {
        assertEquals("dob",
                c("", "candidateDOB", "Date of Birth", "", "type=date"));
        assertEquals("category",
                c("", "candidateCategory", "Category", "", ""));
    }

    @Test
    public void unknownFieldDoesNotGuess() {
        assertEquals("",
                c("", "randomField", "Candidate Address", "", ""));
    }

    @Test
    public void emailAlwaysWinsOverAccidentalNameWords() {
        assertEquals("email",
                c("", "candidateEmail", "Candidate Email ID", "abc@gmail.com", "type=email"));
    }
}
