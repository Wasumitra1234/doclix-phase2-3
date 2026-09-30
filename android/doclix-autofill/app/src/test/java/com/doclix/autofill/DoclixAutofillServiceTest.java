package com.doclix.autofill;

import android.text.InputType;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class DoclixAutofillServiceTest {

    private String node(String id, String hint, String html) {
        return DoclixAutofillService.classifyMetadataForTest(
                new String[0],
                id,
                hint,
                "",
                html,
                InputType.TYPE_CLASS_TEXT);
    }

    @Test
    public void emailIdMapsToEmail() {
        assertEquals("email",
                node("email_id", "Email ID",
                        "name=email_id id=email_id type=email"));
    }

    @Test
    public void confirmEmailIdMapsToEmail() {
        assertEquals("email",
                node("confirm_email_id", "Confirm Email ID",
                        "name=confirm_email_id id=confirm_email_id type=email"));
    }

    @Test
    public void htmlTypeEmailMapsToEmail() {
        assertEquals("email", node("", "", "type=email"));
    }

    @Test
    public void androidEmailInputTypeMapsToEmail() {
        assertEquals("email",
                DoclixAutofillService.classifyMetadataForTest(
                        new String[0], "", "", "", "",
                        InputType.TYPE_CLASS_TEXT
                                | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS));

        assertEquals("email",
                DoclixAutofillService.classifyMetadataForTest(
                        new String[0], "", "", "", "",
                        InputType.TYPE_CLASS_TEXT
                                | InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS));
    }

    @Test
    public void whatsappNoIsBlocked() {
        assertEquals("",
                node("whatsapp_no", "WhatsApp Number", "type=tel"));
    }

    @Test
    public void alternateMobileIsBlocked() {
        assertEquals("",
                node("alt_mobile", "Alternate Mobile Number", "type=tel"));
    }

    @Test
    public void emergencyContactIsBlocked() {
        assertEquals("",
                node("emergency_contact", "Emergency Contact", "type=tel"));
    }

    @Test
    public void alternateEmailIsBlocked() {
        assertEquals("",
                node("alternate_email", "Alternate Email", "type=email"));
    }

    @Test
    public void primaryMobileStillMapsToMobile() {
        assertEquals("mobile",
                node("mobile", "Mobile Number", "type=tel"));

        assertEquals("mobile",
                node("confirm_mobile", "Confirm Mobile No", "type=tel"));
    }

    @Test
    public void firstNameStillMapsToFirstName() {
        assertEquals("first_name",
                node("first_name", "Candidate First Name", ""));
    }

    @Test
    public void lastNameStillMapsToLastName() {
        assertEquals("last_name",
                node("last_name", "Candidate Last Name", ""));
    }

    @Test
    public void fullNameStillMapsToFullName() {
        assertEquals("full_name",
                node("full_name", "Candidate Full Name", ""));
    }

    @Test
    public void emailAutofillHintWins() {
        assertEquals("email",
                DoclixAutofillService.classifyMetadataForTest(
                        new String[]{"emailAddress"},
                        "email_id",
                        "",
                        "",
                        "",
                        InputType.TYPE_CLASS_TEXT));
    }

    @Test
    public void auxiliaryPhoneGuardrailOverridesPhoneHint() {
        assertEquals("",
                DoclixAutofillService.classifyMetadataForTest(
                        new String[]{"phone"},
                        "whatsapp_no",
                        "WhatsApp Number",
                        "",
                        "",
                        InputType.TYPE_CLASS_PHONE));
    }
}
