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

        for (int i = 0; i < structure.getWindowNodeCount(); i++) {
            walkNode(structure.getWindowNodeAt(i).getRootViewNode(),
                    nameIds, emailIds, mobileIds, dobIds, categoryIds);
        }

        FillResponse.Builder response = new FillResponse.Builder();
        boolean added = false;

        if (!nameIds.isEmpty()) {
            Dataset.Builder ds = new Dataset.Builder();
            for (AutofillId id : nameIds) ds.setValue(id, AutofillValue.forText(TEST_NAME));
            response.addDataset(ds.build());
            added = true;
        }
        if (!emailIds.isEmpty()) {
            Dataset.Builder ds = new Dataset.Builder();
            for (AutofillId id : emailIds) ds.setValue(id, AutofillValue.forText(TEST_EMAIL));
            response.addDataset(ds.build());
            added = true;
        }
        if (!mobileIds.isEmpty()) {
            Dataset.Builder ds = new Dataset.Builder();
            for (AutofillId id : mobileIds) ds.setValue(id, AutofillValue.forText(TEST_MOBILE));
            response.addDataset(ds.build());
            added = true;
        }
        if (!dobIds.isEmpty()) {
            Dataset.Builder ds = new Dataset.Builder();
            for (AutofillId id : dobIds) ds.setValue(id, AutofillValue.forText(TEST_DOB));
            response.addDataset(ds.build());
            added = true;
        }
        if (!categoryIds.isEmpty()) {
            Dataset.Builder ds = new Dataset.Builder();
            for (AutofillId id : categoryIds) ds.setValue(id, AutofillValue.forText(TEST_CATEGORY));
            response.addDataset(ds.build());
            added = true;
        }

        callback.onSuccess(added ? response.build() : null);
    }

    private void walkNode(AssistStructure.ViewNode node,
                          List<AutofillId> nameIds,
                          List<AutofillId> emailIds,
                          List<AutofillId> mobileIds,
                          List<AutofillId> dobIds,
                          List<AutofillId> categoryIds) {
        if (node == null) return;

        AutofillId id = node.getAutofillId();
        if (id != null) {
            String[] hints = node.getAutofillHints();
            String hint = hints == null ? "" : String.join(" ", hints);
            String res = node.getIdEntry() == null ? "" : node.getIdEntry();
            String text = node.getText() == null ? "" : node.getText().toString();
            String all = (hint + " " + res + " " + text).toLowerCase(Locale.ROOT);

            if (all.contains("email")) emailIds.add(id);
            else if (all.contains("phone") || all.contains("mobile") || all.contains("tel")) mobileIds.add(id);
            else if (all.contains("birth") || all.contains("dob")) dobIds.add(id);
            else if (all.contains("category") || all.contains("caste")) categoryIds.add(id);
            else if (all.contains("name") || all.contains("candidate") || all.contains("student")) nameIds.add(id);
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            walkNode(node.getChildAt(i), nameIds, emailIds, mobileIds, dobIds, categoryIds);
        }
    }

    @Override
    public void onSaveRequest(SaveRequest request, SaveCallback callback) {
        callback.onSuccess();
    }
}
