package com.doclix.autofill;

import android.app.PendingIntent;
import android.app.assist.AssistStructure;
import android.app.slice.Slice;
import android.content.Intent;
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

public class DoclixAutofillService extends AutofillService {

    private static final String PREFS = "doclix_data_card";
    private static final String DIAG = "doclix_autofill_diag";

    private String value(String key) {
        return getSharedPreferences(PREFS, MODE_PRIVATE)
                .getString(key, "");
    }

    @Override
    public void onFillRequest(
            FillRequest request,
            CancellationSignal cancellationSignal,
            FillCallback callback) {

        getSharedPreferences(DIAG, MODE_PRIVATE).edit()
                .putInt(
                        "requests",
                        getSharedPreferences(DIAG, MODE_PRIVATE)
                                .getInt("requests", 0) + 1)
                .apply();

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
        List<FocusResult> focusedCandidates = new ArrayList<>();

        for (int i = 0; i < structure.getWindowNodeCount(); i++) {
            walkNode(
                    structure.getWindowNodeAt(i).getRootViewNode(),
                    fields,
                    focusedCandidates,
                    0);
        }

        // Chrome/WebView can expose more than one node as focused during a
        // request. Never take the first focused node blindly. Prefer a
        // semantically classified focused node, and among those prefer the
        // deepest node (the actual input is normally deeper than containers).
        FocusResult focused = chooseFocused(focusedCandidates);
        String focusedType = focused == null ? "" : focused.type;

        getSharedPreferences(DIAG, MODE_PRIVATE).edit()
                .putString("last_type", focusedType)
                .putBoolean("focused", focused != null)
                .apply();

        if (focused != null && focused.focusedId != null) {
            String data = valueForType(focusedType);

            if (!focusedType.isEmpty() && !data.isEmpty()) {
                FillResponse.Builder response = new FillResponse.Builder();

                addFocusedDataset(
                        response,
                        focused.focusedId,
                        data,
                        labelForType(focusedType),
                        request);

                callback.onSuccess(response.build());
                return;
            }

            // Unknown/unsupported focused field: do NOT guess by returning
            // First Name as the first suggestion. Returning null is safer.
            callback.onSuccess(null);
            return;
        }

        // No focused field: return only deterministic field-to-ID mappings.
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

    private FocusResult chooseFocused(List<FocusResult> candidates) {
        FocusResult bestKnown = null;
        FocusResult bestUnknown = null;

        for (FocusResult candidate : candidates) {
            if (candidate == null || candidate.focusedId == null) {
                continue;
            }

            if (!candidate.type.isEmpty()) {
                if (bestKnown == null || candidate.depth > bestKnown.depth) {
                    bestKnown = candidate;
                }
            } else if (bestUnknown == null || candidate.depth > bestUnknown.depth) {
                bestUnknown = candidate;
            }
        }

        return bestKnown != null ? bestKnown : bestUnknown;
    }

    private boolean addFocusedDataset(
            FillResponse.Builder response,
            AutofillId id,
            String data,
            String label,
            FillRequest request) {

        if (id == null || data == null || data.isEmpty()) {
            return false;
        }

        Dataset.Builder dataset = new Dataset.Builder();
        RemoteViews presentation = createPresentation(label, data);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            InlineSuggestionsRequest inlineRequest =
                    request.getInlineSuggestionsRequest();

            if (inlineRequest != null
                    && inlineRequest.getMaxSuggestionCount() > 0
                    && !inlineRequest.getInlinePresentationSpecs().isEmpty()) {

                InlinePresentationSpec spec =
                        inlineRequest.getInlinePresentationSpecs().get(0);

                InlinePresentation inlinePresentation =
                        createInlinePresentation(data, spec);

                dataset.setValue(
                        id,
                        AutofillValue.forText(data),
                        presentation,
                        inlinePresentation);
            } else {
                dataset.setValue(
                        id,
                        AutofillValue.forText(data),
                        presentation);
            }
        } else {
            dataset.setValue(
                    id,
                    AutofillValue.forText(data),
                    presentation);
        }

        response.addDataset(dataset.build());
        return true;
    }

    private boolean addDataset(
            FillResponse.Builder response,
            List<AutofillId> ids,
            String data,
            String label) {

        if (ids.isEmpty() || data == null || data.isEmpty()) {
            return false;
        }

        Dataset.Builder dataset = new Dataset.Builder();
        RemoteViews presentation = createPresentation(label, data);

        for (AutofillId id : ids) {
            dataset.setValue(id, AutofillValue.forText(data), presentation);
        }

        response.addDataset(dataset.build());
        return true;
    }

    private RemoteViews createPresentation(String label, String data) {
        RemoteViews presentation = new RemoteViews(
                getPackageName(),
                android.R.layout.simple_list_item_1);

        presentation.setTextViewText(
                android.R.id.text1,
                "Doclix • " + label + ": " + data);

        return presentation;
    }

    private InlinePresentation createInlinePresentation(
            String data,
            InlinePresentationSpec spec) {

        Intent intent = new Intent(this, MainActivity.class);

        PendingIntent attribution = PendingIntent.getActivity(
                this,
                Math.abs(data.hashCode()),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE);

        Slice slice = InlineSuggestionUi
                .newContentBuilder(attribution)
                .setTitle("Doclix")
                .setSubtitle(data)
                .setContentDescription("Doclix Autofill: " + data)
                .build()
                .getSlice();

        return new InlinePresentation(slice, spec, false);
    }

    private String valueForType(String type) {
        switch (type) {
            case "first_name": return value("first_name");
            case "middle_name": return value("middle_name");
            case "last_name": return value("last_name");
            case "full_name": return value("full_name");
            case "email": return value("email");
            case "mobile": return value("mobile");
            case "dob": return value("dob");
            case "category": return value("category");
            default: return "";
        }
    }

    private String labelForType(String type) {
        switch (type) {
            case "first_name": return "First Name";
            case "middle_name": return "Middle Name";
            case "last_name": return "Last Name";
            case "full_name": return "Full Name";
            case "email": return "Email";
            case "mobile": return "Mobile";
            case "dob": return "Date of Birth";
            case "category": return "Category";
            default: return "Field";
        }
    }

    private void walkNode(
            AssistStructure.ViewNode node,
            FieldIds fields,
            List<FocusResult> focusedCandidates,
            int depth) {

        if (node == null) {
            return;
        }

        AutofillId id = node.getAutofillId();
        String type = classify(node);

        if (id != null) {
            switch (type) {
                case "first_name": fields.firstName.add(id); break;
                case "middle_name": fields.middleName.add(id); break;
                case "last_name": fields.lastName.add(id); break;
                case "full_name": fields.fullName.add(id); break;
                case "email": fields.email.add(id); break;
                case "mobile": fields.mobile.add(id); break;
                case "dob": fields.dob.add(id); break;
                case "category": fields.category.add(id); break;
                default: break;
            }
        }

        if (id != null && node.isFocused()) {
            focusedCandidates.add(new FocusResult(id, type, depth));
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            walkNode(
                    node.getChildAt(i),
                    fields,
                    focusedCandidates,
                    depth + 1);
        }
    }

    private String classify(AssistStructure.ViewNode node) {
        String[] hints = node.getAutofillHints();
        String hint = hints == null ? "" : String.join(" ", hints);

        String resourceId = node.getIdEntry() == null ? "" : node.getIdEntry();
        String placeholder = node.getHint() == null ? "" : node.getHint().toString();
        String text = node.getText() == null ? "" : node.getText().toString();

        String htmlAttributes = "";
        AssistStructure.ViewNode.HtmlInfo htmlInfo = node.getHtmlInfo();
        if (htmlInfo != null && htmlInfo.getAttributes() != null) {
            StringBuilder attributes = new StringBuilder();
            for (android.util.Pair<String, String> attribute
                    : htmlInfo.getAttributes()) {
                attributes.append(' ')
                        .append(attribute.first)
                        .append('=')
                        .append(attribute.second);
            }
            htmlAttributes = attributes.toString();
        }

        String webDomain = node.getWebDomain() == null ? "" : node.getWebDomain();

        return FieldClassifier.classify(
                hint,
                resourceId,
                placeholder,
                text,
                htmlAttributes,
                webDomain);
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
        final int depth;

        FocusResult(AutofillId focusedId, String type, int depth) {
            this.focusedId = focusedId;
            this.type = type;
            this.depth = depth;
        }
    }

    @Override
    public void onSaveRequest(
            android.service.autofill.SaveRequest request,
            android.service.autofill.SaveCallback callback) {
        callback.onSuccess();
    }
}
