package com.doclix.autofill;

import android.app.PendingIntent;
import android.app.assist.AssistStructure;
import android.app.slice.Slice;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.InlinePresentation;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;
import android.view.inputmethod.InlineSuggestionsRequest;
import android.widget.RemoteViews;
import android.widget.inline.InlinePresentationSpec;

import androidx.autofill.inline.v1.InlineSuggestionUi;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class DoclixAutofillService extends AutofillService {
    private static final String PREFS = "doclix_data_card";

    private String value(String key) {
        return getSharedPreferences(PREFS, MODE_PRIVATE)
                .getString(key, "");
    }

    @Override
    public void onFillRequest(
            FillRequest request,
            CancellationSignal cancellationSignal,
            FillCallback callback) {

        if (cancellationSignal.isCanceled()) {
            callback.onSuccess(null);
            return;
        }

        List<FillContext> contexts = request.getFillContexts();
        if (contexts == null || contexts.isEmpty()) {
            callback.onSuccess(null);
            return;
        }

        AssistStructure structure =
                contexts.get(contexts.size() - 1).getStructure();

        FieldIds fields = new FieldIds();
        AutofillId focusedId = null;
        String focusedType = "";

        for (int i = 0; i < structure.getWindowNodeCount(); i++) {
            FocusResult result = walkNode(
                    structure.getWindowNodeAt(i).getRootViewNode(),
                    fields);

            if (result.focusedId != null) {
                focusedId = result.focusedId;
                focusedType = result.type;
                break;
            }
        }

        if (focusedId != null) {
            String autofillValue = valueForType(focusedType);

            if (autofillValue.isEmpty()) {
                callback.onSuccess(null);
                return;
            }

            Dataset.Builder dataset = new Dataset.Builder();
            RemoteViews menuPresentation =
                    createPresentation(labelForType(focusedType), autofillValue);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InlineSuggestionsRequest inlineRequest =
                        request.getInlineSuggestionsRequest();

                if (inlineRequest != null
                        && inlineRequest.getMaxSuggestionCount() > 0
                        && !inlineRequest.getInlinePresentationSpecs().isEmpty()) {

                    InlinePresentationSpec spec =
                            inlineRequest.getInlinePresentationSpecs().get(0);

                    InlinePresentation inlinePresentation =
                            createInlinePresentation(autofillValue, spec);

                    dataset.setValue(
                            focusedId,
                            AutofillValue.forText(autofillValue),
                            menuPresentation,
                            inlinePresentation);
                } else {
                    dataset.setValue(
                            focusedId,
                            AutofillValue.forText(autofillValue),
                            menuPresentation);
                }
            } else {
                dataset.setValue(
                        focusedId,
                        AutofillValue.forText(autofillValue),
                        menuPresentation);
            }

            callback.onSuccess(
                    new FillResponse.Builder()
                            .addDataset(dataset.build())
                            .build());
            return;
        }

        FillResponse.Builder response = new FillResponse.Builder();
        boolean added = false;

        added |= addDataset(response, fields.firstName, value("first_name"), "First Name");
        added |= addDataset(response, fields.middleName, value("middle_name"), "Middle Name");
        added |= addDataset(response, fields.lastName, value("last_name"), "Last Name");
        added |= addDataset(response, fields.fullName, value("full_name"), "Full Name");
        added |= addDataset(response, fields.email, value("email"), "Email");
        added |= addDataset(response, fields.mobile, value("mobile"), "Mobile");
        added |= addDataset(response, fields.dob, value("dob"), "Date of Birth");
        added |= addDataset(response, fields.category, value("category"), "Category");

        callback.onSuccess(added ? response.build() : null);
    }

    private boolean addDataset(
            FillResponse.Builder response,
            List<AutofillId> ids,
            String value,
            String label) {

        if (ids.isEmpty() || value == null || value.isEmpty()) {
            return false;
        }

        Dataset.Builder dataset = new Dataset.Builder();
        RemoteViews presentation = createPresentation(label, value);

        for (AutofillId id : ids) {
            dataset.setValue(
                    id,
                    AutofillValue.forText(value),
                    presentation);
        }

        response.addDataset(dataset.build());
        return true;
    }

    private RemoteViews createPresentation(String label, String value) {
        RemoteViews presentation =
                new RemoteViews(
                        getPackageName(),
                        android.R.layout.simple_list_item_1);

        presentation.setTextViewText(
                android.R.id.text1,
                "Doclix • " + label + ": " + value);

        return presentation;
    }

    private InlinePresentation createInlinePresentation(
            String value,
            InlinePresentationSpec spec) {

        Intent intent = new Intent(this, MainActivity.class);

        PendingIntent attribution = PendingIntent.getActivity(
                this,
                Math.abs(value.hashCode()),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE);

        Slice slice = InlineSuggestionUi
                .newContentBuilder(attribution)
                .setTitle("Doclix")
                .setSubtitle(value)
                .setContentDescription("Doclix Autofill: " + value)
                .build()
                .getSlice();

        return new InlinePresentation(slice, spec, false);
    }

    private String valueForType(String type) {
        switch (type) {
            case "first_name":
                return value("first_name");
            case "middle_name":
                return value("middle_name");
            case "last_name":
                return value("last_name");
            case "full_name":
                return value("full_name");
            case "email":
                return value("email");
            case "mobile":
                return value("mobile");
            case "dob":
                return value("dob");
            case "category":
                return value("category");
            default:
                return "";
        }
    }

    private String labelForType(String type) {
        switch (type) {
            case "first_name":
                return "First Name";
            case "middle_name":
                return "Middle Name";
            case "last_name":
                return "Last Name";
            case "full_name":
                return "Full Name";
            case "email":
                return "Email";
            case "mobile":
                return "Mobile";
            case "dob":
                return "Date of Birth";
            case "category":
                return "Category";
            default:
                return "Field";
        }
    }

    private FocusResult walkNode(
            AssistStructure.ViewNode node,
            FieldIds fields) {

        if (node == null) {
            return new FocusResult(null, "");
        }

        AutofillId id = node.getAutofillId();
        String type = classify(node);

        if (id != null) {
            switch (type) {
                case "first_name":
                    fields.firstName.add(id);
                    break;
                case "middle_name":
                    fields.middleName.add(id);
                    break;
                case "last_name":
                    fields.lastName.add(id);
                    break;
                case "full_name":
                    fields.fullName.add(id);
                    break;
                case "email":
                    fields.email.add(id);
                    break;
                case "mobile":
                    fields.mobile.add(id);
                    break;
                case "dob":
                    fields.dob.add(id);
                    break;
                case "category":
                    fields.category.add(id);
                    break;
            }
        }

        if (id != null && node.isFocused()) {
            return new FocusResult(id, type);
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            FocusResult child = walkNode(node.getChildAt(i), fields);
            if (child.focusedId != null) {
                return child;
            }
        }

        return new FocusResult(null, "");
    }

    private String classify(AssistStructure.ViewNode node) {
        String[] hints = node.getAutofillHints();
        String hint = hints == null ? "" : String.join(" ", hints);

        String res = node.getIdEntry() == null ? "" : node.getIdEntry();
        String text = node.getText() == null ? "" : node.getText().toString();
        String placeholder = node.getHint() == null ? "" : node.getHint().toString();

        String all = (hint + " " + res + " " + text + " " + placeholder)
                .toLowerCase(Locale.ROOT);

        if (all.contains("email")) {
            return "email";
        }

        if (all.contains("phone")
                || all.contains("mobile")
                || all.contains("tel")) {
            return "mobile";
        }

        if (all.contains("birth")
                || all.contains("dob")) {
            return "dob";
        }

        if (all.contains("category")
                || all.contains("caste")) {
            return "category";
        }

        if (all.contains("full name")
                || all.contains("fullname")) {
            return "full_name";
        }

        if (all.contains("middle name")
                || all.contains("middlename")) {
            return "middle_name";
        }

        if (all.contains("first name")
                || all.contains("firstname")) {
            return "first_name";
        }

        if (all.contains("last name")
                || all.contains("lastname")
                || all.contains("surname")) {
            return "last_name";
        }

        return "";
    }

    private static final class FieldIds {
        final List<AutofillId> firstName = new ArrayList<>();
        final List<AutofillId> middleName = new ArrayList<>();
        final List<AutofillId> lastName = new ArrayList<>();
        final List<AutofillId> fullName = new ArrayList<>();
        final List<AutofillId> email = new ArrayList<>();
        final List<AutofillId> mobile = new ArrayList<>();
        final List<AutofillId> dob = new ArrayList<>();
        final List<AutofillId> category = new ArrayList<>();
    }

    private static final class FocusResult {
        final AutofillId focusedId;
        final String type;

        FocusResult(AutofillId focusedId, String type) {
            this.focusedId = focusedId;
            this.type = type;
        }
    }

    @Override
    public void onSaveRequest(
            android.service.autofill.SaveRequest request,
            android.service.autofill.SaveCallback callback) {
        callback.onSuccess();
    }
}
