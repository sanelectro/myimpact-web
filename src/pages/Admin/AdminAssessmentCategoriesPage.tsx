import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addAssessmentCategoryCriterion,
  createAssessmentCategory,
  getAssessmentCategories,
} from "../../api/myImpact";
import type {
  GoalCriterionDefinition,
  GoalCriterionType,
} from "../../types/api";
import "./AdminAssessmentCategoriesPage.css";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function AdminAssessmentCategoriesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [criterionTitle, setCriterionTitle] = useState("");
  const [criterionType, setCriterionType] = useState<GoalCriterionType>("BINARY");
  const [criterionDescription, setCriterionDescription] = useState("");
  const [completionConditions, setCompletionConditions] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["admin", "assessment-categories"],
    queryFn: getAssessmentCategories,
  });
  const selected = categoriesQuery.data?.find((item) => item.id === selectedId) ?? null;

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createAssessmentCategory({
        name: categoryName,
        description: categoryDescription.trim() || null,
      }),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessment-categories"] });
      setSelectedId(category.id);
      setCategoryName("");
      setCategoryDescription("");
    },
  });

  const addCriterionMutation = useMutation({
    mutationFn: () => {
      const definition: GoalCriterionDefinition = {
        criterion_type: criterionType,
        description: criterionDescription,
        completion_conditions: completionConditions || null,
        milestones: [],
        target_value: criterionType === "MEASURABLE_TARGET" ? Number(targetValue) : null,
        unit: criterionType === "MEASURABLE_TARGET" ? unit : null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      };
      return addAssessmentCategoryCriterion(selected!.id, {
        title: criterionTitle,
        definition,
      });
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessment-categories"] });
      setSelectedId(category.id);
      setCriterionTitle("");
      setCriterionDescription("");
      setCompletionConditions("");
      setTargetValue("");
      setUnit("");
    },
  });

  if (categoriesQuery.isLoading) return <p role="status">Loading assessment categories…</p>;
  if (categoriesQuery.isError) {
    return <p role="alert">Could not load assessment categories: {errorMessage(categoriesQuery.error)}</p>;
  }

  return (
    <div className="admin-assessment-categories">
      <header className="admin-assessment-categories-hero">
        <div>
          <div className="eyebrow">GOALS AND ASSESSMENT DESIGN</div>
          <h1>Assessment categories</h1>
          <p>Define reusable categories and criterion templates for future goal assessments.</p>
        </div>
      </header>

      <div className="admin-assessment-categories-layout">
        <section className="surface-card admin-assessment-category-list">
          <div className="card-eyebrow">CATEGORIES</div>
          <h2>Assessment library</h2>
          {(categoriesQuery.data ?? []).map((category) => (
            <button
              className={category.id === selectedId ? "assessment-category-option selected" : "assessment-category-option"}
              key={category.id}
              type="button"
              onClick={() => setSelectedId(category.id)}
            >
              <strong>{category.name}</strong>
              <span>{category.criteria.length} criteria</span>
            </button>
          ))}
          {!categoriesQuery.data?.length && <p>No categories have been created yet.</p>}
        </section>

        <section className="surface-card admin-assessment-category-editor">
          <div className="card-eyebrow">NEW CATEGORY</div>
          <h2>Add a category</h2>
          <form onSubmit={(event) => { event.preventDefault(); createCategoryMutation.mutate(); }}>
            <label>Category name<input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Evidence quality" /></label>
            <label>Description<textarea value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} placeholder="What this category evaluates" /></label>
            {createCategoryMutation.isError && <p className="admin-assessment-error" role="alert">{errorMessage(createCategoryMutation.error)}</p>}
            <button className="primary-link" type="submit" disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? "Adding…" : "Add category"}
            </button>
          </form>
        </section>
      </div>

      {selected && (
        <section className="surface-card admin-assessment-criteria-editor">
          <div className="section-heading">
            <div>
              <div className="card-eyebrow">CRITERIA</div>
              <h2>{selected.name}</h2>
              <p>{selected.description || "No category description has been added."}</p>
            </div>
          </div>
          <div className="admin-assessment-criteria-grid">
            <div>
              <h3>Existing templates</h3>
              {selected.criteria.length ? selected.criteria.map((criterion) => (
                <article className="assessment-criterion-card" key={criterion.id}>
                  <strong>{criterion.title}</strong>
                  <span>{criterion.definition.criterion_type}</span>
                  <p>{criterion.definition.description}</p>
                </article>
              )) : <p>No criteria in this category yet.</p>}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); addCriterionMutation.mutate(); }}>
              <h3>Add assessment criterion</h3>
              <label>Title<input required value={criterionTitle} onChange={(event) => setCriterionTitle(event.target.value)} placeholder="Evidence supports the claimed outcome" /></label>
              <label>Type<select value={criterionType} onChange={(event) => setCriterionType(event.target.value as GoalCriterionType)}><option value="BINARY">Binary</option><option value="MEASURABLE_TARGET">Measurable target</option></select></label>
              <label>Description<textarea required value={criterionDescription} onChange={(event) => setCriterionDescription(event.target.value)} /></label>
              <label>Completion conditions<textarea required value={completionConditions} onChange={(event) => setCompletionConditions(event.target.value)} /></label>
              {criterionType === "MEASURABLE_TARGET" && (
                <div className="admin-assessment-inline-fields">
                  <label>Target<input required type="number" min="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /></label>
                  <label>Unit<input required value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="percent" /></label>
                </div>
              )}
              {addCriterionMutation.isError && <p className="admin-assessment-error" role="alert">{errorMessage(addCriterionMutation.error)}</p>}
              <button className="primary-link" type="submit" disabled={addCriterionMutation.isPending}>
                {addCriterionMutation.isPending ? "Adding…" : "Add criterion"}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
