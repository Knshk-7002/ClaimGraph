export const datasets = {
  remote_work: {
    name: "Remote Work & Productivity",
    description: "Does remote work reduce overall team productivity?",
    data: {
      claims: [
        { id: "rw_individual_output", text: "Remote work reduces individual output for routine knowledge tasks.", tags: ["remote-work", "productivity"], context: "Knowledge workers, post-2020" },
        { id: "rw_focus_deep_work", text: "Remote work improves focus for deep, uninterrupted work.", tags: ["remote-work", "deep-work"], context: "Roles with long uninterrupted tasks" },
        { id: "rw_team_coordination", text: "Remote work harms cross-team coordination on novel projects.", tags: ["remote-work", "coordination"], context: "Cross-functional product teams" },
        { id: "rw_office_distractions", text: "Office environments contain more involuntary interruptions than home offices.", tags: ["remote-work", "interruptions"], context: "" },
        { id: "rw_async_comm_overhead", text: "Asynchronous communication adds latency to ambiguous decisions.", tags: ["remote-work", "communication"], context: "" },
        { id: "rw_overall_productivity", text: "Remote work reduces overall team productivity.", tags: ["remote-work", "productivity"], context: "The headline question from the ClaimGraph walkthrough." }
      ],
      evidence: [
        { id: "rw_e1", claim_id: "rw_individual_output", source: "Bloom et al., QJE 2015 - Ctrip RCT on work-from-home", direction: "contradicts", strength: 0.85, source_quality: 0.9, notes: "13% performance increase among call-center workers." },
        { id: "rw_e2", claim_id: "rw_individual_output", source: "Microsoft WTI 2022, large internal observational study", direction: "supports", strength: 0.5, source_quality: 0.55, notes: "Self-report; mixed signal across roles." },
        { id: "rw_e3", claim_id: "rw_focus_deep_work", source: "DeFilippis et al., HBS WP 2020 - calendar telemetry", direction: "supports", strength: 0.6, source_quality: 0.75, notes: "" },
        { id: "rw_e4", claim_id: "rw_office_distractions", source: "Mark et al., CHI 2008 - interruption study", direction: "supports", strength: 0.75, source_quality: 0.8, notes: "" },
        { id: "rw_e5", claim_id: "rw_team_coordination", source: "Yang et al., Nat. Hum. Behav. 2022 - Microsoft collaboration networks", direction: "supports", strength: 0.7, source_quality: 0.85, notes: "Cross-group ties weakened during shift to remote." },
        { id: "rw_e6", claim_id: "rw_team_coordination", source: "GitLab transparency report 2023", direction: "contradicts", strength: 0.4, source_quality: 0.45, notes: "All-remote org with strong async culture." },
        { id: "rw_e7", claim_id: "rw_async_comm_overhead", source: "Cramton, Org. Sci. 2001", direction: "supports", strength: 0.6, source_quality: 0.7, notes: "" }
      ],
      edges: [
        { source: "rw_focus_deep_work", target: "rw_office_distractions", type: "depends_on", weight: 1.0, notes: "Focus advantage relies on home having fewer interruptions." },
        { source: "rw_team_coordination", target: "rw_async_comm_overhead", type: "depends_on", weight: 1.0, notes: "" },
        { source: "rw_overall_productivity", target: "rw_individual_output", type: "depends_on", weight: 1.0, notes: "" },
        { source: "rw_overall_productivity", target: "rw_focus_deep_work", type: "depends_on", weight: 1.0, notes: "" },
        { source: "rw_overall_productivity", target: "rw_team_coordination", type: "depends_on", weight: 1.0, notes: "" },
        { source: "rw_focus_deep_work", target: "rw_individual_output", type: "contradicts", weight: 0.6, notes: "If focus is better remote, individual output going down is harder to justify." },
        { source: "rw_team_coordination", target: "rw_overall_productivity", type: "supports", weight: 0.6, notes: "" }
      ]
    }
  },
  intermittent_fasting: {
    name: "Intermittent Fasting",
    description: "Does intermittent fasting improve insulin sensitivity?",
    data: {
      claims: [
        { id: "if_insulin_sensitivity", text: "Intermittent fasting improves insulin sensitivity in adults.", tags: ["nutrition", "metabolism"], context: "Healthy adults, 12-week regimens" },
        { id: "if_fasting_lowers_insulin", text: "Time-restricted eating lowers fasting insulin.", tags: ["nutrition"], context: "" },
        { id: "if_caloric_deficit", text: "Time-restricted eating leads to a modest spontaneous caloric deficit.", tags: ["nutrition", "calories"], context: "" },
        { id: "if_weight_loss", text: "Time-restricted eating produces modest weight loss in adults.", tags: ["nutrition", "weight"], context: "" },
        { id: "if_independent_of_calories", text: "Intermittent fasting improves insulin sensitivity independently of weight loss.", tags: ["nutrition", "metabolism"], context: "" }
      ],
      evidence: [
        { id: "if_e1", claim_id: "if_fasting_lowers_insulin", source: "Sutton et al., Cell Metabolism 2018 - 5wk early TRF crossover", direction: "supports", strength: 0.7, source_quality: 0.85, notes: "" },
        { id: "if_e2", claim_id: "if_caloric_deficit", source: "Gabel et al., Nutr. Healthy Aging 2018", direction: "supports", strength: 0.55, source_quality: 0.6, notes: "" },
        { id: "if_e3", claim_id: "if_weight_loss", source: "Cienfuegos et al., Cell Metabolism 2020 - 4h vs 6h TRF RCT", direction: "supports", strength: 0.65, source_quality: 0.8, notes: "" },
        { id: "if_e4", claim_id: "if_weight_loss", source: "Lowe et al., JAMA Intern. Med. 2020 - TREAT RCT", direction: "contradicts", strength: 0.6, source_quality: 0.85, notes: "TRE alone produced only minimal weight loss vs control." },
        { id: "if_e5", claim_id: "if_independent_of_calories", source: "Liu et al., NEJM 2022 - 12mo TRE vs caloric restriction", direction: "contradicts", strength: 0.7, source_quality: 0.95, notes: "Similar outcomes when calories matched." },
        { id: "if_e6", claim_id: "if_insulin_sensitivity", source: "Sundfor et al., Nutr. Metab. Cardiovasc. Dis. 2018", direction: "supports", strength: 0.5, source_quality: 0.7, notes: "" }
      ],
      edges: [
        { source: "if_weight_loss", target: "if_caloric_deficit", type: "depends_on", weight: 1.0, notes: "" },
        { source: "if_insulin_sensitivity", target: "if_fasting_lowers_insulin", type: "depends_on", weight: 1.0, notes: "" },
        { source: "if_insulin_sensitivity", target: "if_weight_loss", type: "depends_on", weight: 0.7, notes: "Weight loss is a known mediator of insulin sensitivity improvement." },
        { source: "if_independent_of_calories", target: "if_insulin_sensitivity", type: "depends_on", weight: 1.0, notes: "" },
        { source: "if_independent_of_calories", target: "if_weight_loss", type: "contradicts", weight: 0.8, notes: "If weight loss is the mediator, the 'independent' claim weakens." }
      ]
    }
  },
  ai_hallucinations: {
    name: "AI Hallucinations",
    description: "Do LLMs hallucinate more when trained on synthetic data?",
    data: {
      claims: [
        { id: "ai_synth_data_hallucinate", text: "AI models hallucinate more when fine-tuned on synthetic data.", tags: ["ai", "training-data"], context: "" },
        { id: "ai_synth_distribution_drift", text: "Synthetic data drifts from the source distribution as it is generated.", tags: ["ai", "distribution"], context: "" },
        { id: "ai_model_collapse", text: "Recursive training on model-generated text causes model collapse.", tags: ["ai", "training"], context: "" },
        { id: "ai_rlhf_reduces_hallucination", text: "RLHF on human-labelled corrections reduces hallucination rate.", tags: ["ai", "rlhf"], context: "" },
        { id: "ai_retrieval_grounding_reduces", text: "Retrieval-augmented generation reduces hallucination on factual queries.", tags: ["ai", "rag"], context: "" },
        { id: "ai_overall_hallucinations_growing", text: "Overall hallucination rate grows as LLMs train on more web-scraped, AI-authored content.", tags: ["ai", "trend"], context: "" }
      ],
      evidence: [
        { id: "ai_e1", claim_id: "ai_model_collapse", source: "Shumailov et al., Nature 2024 - 'The Curse of Recursion'", direction: "supports", strength: 0.85, source_quality: 0.95, notes: "" },
        { id: "ai_e2", claim_id: "ai_synth_distribution_drift", source: "Alemohammad et al., 2023 - self-consuming generative models", direction: "supports", strength: 0.7, source_quality: 0.75, notes: "" },
        { id: "ai_e3", claim_id: "ai_synth_data_hallucinate", source: "Gerstgrasser et al., 2024 - mixed real+synthetic training", direction: "contradicts", strength: 0.6, source_quality: 0.7, notes: "Mixing synthetic with real data avoided collapse." },
        { id: "ai_e4", claim_id: "ai_rlhf_reduces_hallucination", source: "Ouyang et al., 2022 - InstructGPT", direction: "supports", strength: 0.65, source_quality: 0.85, notes: "" },
        { id: "ai_e5", claim_id: "ai_retrieval_grounding_reduces", source: "Lewis et al., NeurIPS 2020 - RAG", direction: "supports", strength: 0.75, source_quality: 0.9, notes: "" }
      ],
      edges: [
        { source: "ai_model_collapse", target: "ai_synth_distribution_drift", type: "depends_on", weight: 1.0, notes: "" },
        { source: "ai_synth_data_hallucinate", target: "ai_synth_distribution_drift", type: "depends_on", weight: 1.0, notes: "" },
        { source: "ai_overall_hallucinations_growing", target: "ai_synth_data_hallucinate", type: "depends_on", weight: 1.0, notes: "" },
        { source: "ai_overall_hallucinations_growing", target: "ai_model_collapse", type: "depends_on", weight: 0.7, notes: "" },
        { source: "ai_rlhf_reduces_hallucination", target: "ai_overall_hallucinations_growing", type: "contradicts", weight: 0.7, notes: "" },
        { source: "ai_retrieval_grounding_reduces", target: "ai_overall_hallucinations_growing", type: "contradicts", weight: 0.7, notes: "" }
      ]
    }
  }
};
