Good next features, in priority order:

1. Auto-layout button
    Reset node positions using Dagre, while preserving the FSM model.
2. Validation upgrade
    Add checks closer to fsm2logisim: outgoing transition coverage and mutual exclusivity per state, using a JS Boolean parser or a small truth-table evaluator.
3. Import .gv
    Load existing course .gv files back into the editor.
4. Export Verilog
    Generate a simple FSM module for simulation/synthesis, initially ROM-style or case-statement style.
5. Undo/redo stack
    Replace one-step undo with multi-step undo/redo.
6. Example gallery
    Built-in examples: sequence detector, traffic light, memory controller, Moore vs Mealy.
7. Per-state/edge notes
    Student-readable comments that are saved in project JSON but not exported to .gv.
8. FSM type mode
    Toggle “Moore-style” vs “Mealy-style” guidance, with warnings if outputs are placed inconsistently.
9. Coverage visualization
    For each state, show “covered / overlapping / missing input cases” once Boolean validation is added.
10. Export image/SVG
    Useful for reports, slides, and submissions.