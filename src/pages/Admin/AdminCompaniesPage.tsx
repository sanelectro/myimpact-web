import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { getAdminCompanies, updateAdminCompany } from "../../api/myImpact";
import type { AdminCompany } from "../../types/api";
import "./AdminCompaniesPage.css";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const companiesQuery = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: getAdminCompanies,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateAdminCompany(id, { name }),
    onSuccess: (updatedCompany) => {
      queryClient.setQueryData<AdminCompany[]>(
        ["admin", "companies"],
        (companies) =>
          companies?.map((company) =>
            company.id === updatedCompany.id ? updatedCompany : company,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-company-users"] });
      setEditingCompanyId(null);
      setDraftName("");
    },
  });

  function startEditing(company: AdminCompany) {
    updateMutation.reset();
    setEditingCompanyId(company.id);
    setDraftName(company.name);
  }

  function cancelEditing() {
    setEditingCompanyId(null);
    setDraftName("");
    updateMutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, companyId: string) {
    event.preventDefault();
    updateMutation.mutate({ id: companyId, name: draftName });
  }

  if (companiesQuery.isLoading) {
    return <p role="status">Loading customer companies…</p>;
  }
  if (companiesQuery.isError) {
    return (
      <p role="alert">
        Could not load customer companies: {errorMessage(companiesQuery.error)}
      </p>
    );
  }

  const companies = companiesQuery.data ?? [];

  return (
    <div className="admin-company-page">
      <header className="admin-company-heading">
        <div className="eyebrow">MYIMPACT PLATFORM ADMINISTRATION</div>
        <h1>Company information</h1>
        <p>
          Maintain customer company names and review how many employee accounts
          belong to each company.
        </p>
      </header>

      <section className="surface-card admin-company-card">
        <div className="admin-company-section-heading">
          <div>
            <div className="card-eyebrow">CUSTOMER COMPANIES</div>
            <h2>Company directory</h2>
          </div>
          <span>{companies.length} companies</span>
        </div>

        {updateMutation.isError && (
          <p className="admin-company-error" role="alert">
            Could not update company information:{" "}
            {errorMessage(updateMutation.error)}
          </p>
        )}
        {updateMutation.isSuccess && (
          <p className="admin-company-success" role="status">
            Company information updated.
          </p>
        )}

        {companies.length ? (
          <div className="admin-company-table-wrap">
            <table className="admin-company-table">
              <thead>
                <tr>
                  <th scope="col">Company name</th>
                  <th scope="col">Employee accounts</th>
                  <th scope="col">Added</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const isEditing = editingCompanyId === company.id;
                  return (
                    <tr key={company.id}>
                      <td>
                        {isEditing ? (
                          <form
                            id={`company-form-${company.id}`}
                            className="admin-company-edit-form"
                            onSubmit={(event) => handleSubmit(event, company.id)}
                          >
                            <label
                              className="visually-hidden"
                              htmlFor={`company-name-${company.id}`}
                            >
                              Company name
                            </label>
                            <input
                              id={`company-name-${company.id}`}
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              maxLength={200}
                              required
                              autoFocus
                            />
                          </form>
                        ) : (
                          <strong>{company.name}</strong>
                        )}
                      </td>
                      <td>{company.user_count.toLocaleString()}</td>
                      <td>{new Date(company.created_at).toLocaleDateString()}</td>
                      <td className="admin-company-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="admin-company-save"
                              type="submit"
                              form={`company-form-${company.id}`}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? "Saving…" : "Save"}
                            </button>
                            <button
                              className="admin-company-cancel"
                              type="button"
                              onClick={cancelEditing}
                              disabled={updateMutation.isPending}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-company-edit"
                            type="button"
                            aria-label={`Edit company ${company.name}`}
                            onClick={() => startEditing(company)}
                          >
                            Edit company
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-company-empty">
            No customer companies have been added yet.
          </p>
        )}
      </section>
    </div>
  );
}
