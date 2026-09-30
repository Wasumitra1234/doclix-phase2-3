package com.doclix.autofill;

import android.app.assist.AssistStructure;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class DoclixAutofillService extends AutofillService {
    private static final String TEST_NAME = "Test Student";
    private static final String TEST_EMAIL = "test@example.com";
    private static final String TEST_MOBILE = "0000000000";
    private static final String TEST_DOB = "01/01/2000";
    private static final String TEST_CATEGORY = "SC";

    @Override
    public void onFillRequest(FillRequest request, CancellationSignal cancellationSignal, FillCallback callback) {
        if (cancellationSignal.isCanceled()) return;

        List<FillContext> contexts = request.getFillContexts();
        if (contexts == null || contexts.isEmpty()) {
            callback.onSuccess(null);
            return;
        }

        AssistStructure structure = contexts.get(contexts.size() - 1).getStructure();

        List<AutofillId> nameIds = new ArrayList<>();
        List<AutofillId> emailIds = new ArrayList<>();
        List<AutofillId> mobileIds = new ArrayList<>();
        List<AutofillId> dobIds = new ArrayList<>();
        List<AutofillId> categoryIds = new ArrayList<>();
        AutofillId focusedId = null;
        String focusedType = "";

        for (int i = 0; i < structure.getWindowNodeCount(); i++) {
            FocusResult result = walkNode(structure.getWindowNodeAt(i).getRootViewNode(),
                    nameIds, emailIds, mobileIds, dobIds, categoryIds);
            if (result.focusedId != null) {
                focusedId = result.focusedId;
                focusedType = result.type;
            }
        }

        FillResponse.Builder response = new FillResponse.Builder();
        boolean added = false;

        // First provide a dataset specifically for the field currently focused.
        // This is important for Chrome pages whose HTML fields do not expose
        // reliable autofill hints/resource IDs.
        if (focusedId != null) {
            Dataset.Builder focused = new Dataset.Builder();
            focused.setValue(focusedId, AutofillValue.forText(valueForType(focusedType)));
            response.addDataset(focused.build());
            added = true;
        }

        added |= addDataset(response, nameIds, TEST_NAME);
        added |= addDataset(response, emailIds, TEST_EMAIL);
        added |= addDataset(response, mobileIds, TEST_MOBILE);
        added |= addDataset(response, dobIds, TEST_DOB);
        added |= addDataset(response, categoryIds, TEST_CATEGORY);

        callback.onSuccess(added ? response.build() : null);
    }

    private boolean addDataset(FillResponse.Builder response, List<AutofillId> ids, String value) {
        if (ids.isEmpty()) return false;
        Dataset.Builder ds = new Dataset.Builder();
        for (AutofillId id : ids) {
            ds.setValue(id, AutofillValue.forText(value));
        }
        response.addDataset(ds.build());
        return true;
    }

    private String valueForType(String type) {
        switch (type) {
            case "email": return TEST_EMAIL;
            case "mobile": return TEST_MOBILE;
            case "dob": return TEST_DOB;
            case "category": return TEST_CATEGORY;
            default: return TEST_NAME;
        }
    }

    private FocusResult walkNode(AssistStructure.ViewNode node,
                                 List<AutofillId> nameIds,
                                 List<AutofillId> emailIds,
                                 List<AutofillId> mobileIds,
                                 List<AutofillId> dobIds,
                                 List<AutofillId> categoryIds) {
        if (node == null) return new FocusResult(null, "");

        AutofillId id = node.getAutofillId();
        String type = classify(node);

        if (id != null) {
            if ("email".equals(type)) emailIds.add(id);
            else if ("mobile".equals(type)) mobileIds.add(id);
            else if ("dob".equals(type)) dobIds.add(id);
            else if ("category".equals(type)) categoryIds.add(id);
            else if ("name".equals(type)) nameIds.add(id);
        }

        if (id != null && node.isFocused()) {
            return new FocusResult(id, type);
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            FocusResult child = walkNode(node.getChildAt(i), nameIds, emailIds, mobileIds, dobIds, categoryIds);
            if (child.focusedId != null) return child;
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

        if (all.contains("email")) return "email";
        if (all.contains("phone") || all.contains("mobile") || all.contains("tel")) return "mobile";
        if (all.contains("birth") || all.contains("dob")) return "dob";
        if (all.contains("category") || all.contains("caste")) return "category";
        if (all.contains("name") || all.contains("candidate") || all.contains("student")) return "name";
        return "name";
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
    public void onSaveRequest(SaveRequest request, SaveCallback callback) {
        callback.onSuccess();
    }
}
