# M16 FSM Editor — User Guide

Welcome to the M16 FSM Editor.

This tool provides a visual environment for constructing finite state machines (FSMs) and exporting them into the `.gv` format used by the `fsm2logisim` workflow in UCLA ECE M16 / CS M51A.

The editor supports:

- Interactive state diagrams
- Mealy and Moore FSMs
- Multibit signals
- Friendly multibit expressions
- Aliases
- Validation
- Save/load of editable FSM projects
- Export to `fsm2logisim`-compatible `.gv`

---

# Quick Start

## 1. Define inputs and outputs

Use the **Signals** panel.

Examples:

```text
Inputs:
X
```

```text
Inputs:
go,ws,x[2]
```

```text
Outputs:
Z
```

```text
Outputs:
rd,ds,y[2]
```

Signals with `[n]` are multibit.

Example:

```text
x[4]
```

means `x` is 4 bits wide.

---

# Creating States

Use the **Add state** button in the **Structure** panel.

Each state has:

- a name
- an optional Moore output assignment
- a start-state property

Click a state to edit it.

---

# Creating Transitions

Use the **Add transition** controls in the **Structure** panel.

Choose:

- source state
- destination state

Then click:

```text
Add transition
```

Click a transition edge to edit:

- transition condition
- Mealy outputs/actions

---

# Conditions

Transition conditions are Boolean expressions.

Examples:

```text
X
~X
go & ws
```

## Multibit Comparisons

Friendly multibit comparisons are supported.

Examples:

```text
x == 2'b10
x != 0x0
x == 3
```

These are automatically expanded into bit-level expressions during `.gv` export.

---

# Mealy Actions

Mealy actions are output assignments attached to transitions.

Examples:

```text
Z=1
```

```text
rd=0,ds=1
```

## Multibit Assignments

Friendly multibit assignments are supported.

Examples:

```text
y = 2'b10
y = 0b10
y = 0x2
y = 2
```

These are automatically expanded into individual bit assignments during `.gv` export.

---

# Moore Actions

Moore actions are outputs associated with states.

Click a state to edit its Moore outputs.

Example:

```text
rd=1,ds=0
```

---

# Aliases

Aliases provide shorthand names for conditions or actions.

Use the **Aliases** panel.

Format:

```text
name: value
```

Examples:

```text
a1: x == 0x2
```

```text
y10: y=2'b10
```

Use aliases inside conditions/actions with braces:

```text
{a1}
```

```text
{y10}
```

Nested aliases are intentionally not supported.

---

# Repositioning States

States can be dragged freely on the canvas.

This only affects visual layout.

---

# Reconnecting Transitions

Transitions can be rerouted interactively.

You can:

- reconnect to another state
- reconnect to another handle on the same state
- move self-loops to different sides of a state

This affects visual routing only.

It does NOT affect `.gv` export semantics.

---

# Validation Panel

The editor continuously validates the FSM.

The validation panel reports:

- unknown states
- unknown signals
- missing aliases
- duplicate declarations
- invalid multibit expressions
- invalid `.gv` export conditions

Warnings do not block editing.

Errors may prevent `.gv` export.

---

# Saving Your Work

Use:

```text
Save project JSON
```

This saves:

- FSM model
- state positions
- transition routing
- aliases
- friendly expressions

Project files use:

```text
*.fsm.json
```

Reload them later using:

```text
Load project JSON
```

---

# Exporting `.gv`

Use:

```text
Download .gv
```

The exported `.gv` file is compatible with:

- `fsm2logisim`
- Graphviz visualization tools
- the course FSM workflow

The exported file uses expanded bit-level expressions.

---

# Example Workflow

## Step 1 — Signals

```text
Inputs:
X

Outputs:
Z
```

## Step 2 — States

Create:

```text
A
B
```

Mark `A` as the start state.

## Step 3 — Transitions

```text
A -> A : ~X / Z=0
A -> B : X / Z=0
B -> A : ~X / Z=1
B -> B : X / Z=1
```

## Step 4 — Export

Click:

```text
Download .gv
```

---

# Tips

## Friendly syntax is preserved visually

The editor keeps expressions readable:

```text
x == 0x2
```

instead of showing expanded bit-level logic.

Expansion happens only during `.gv` export.

## Self-loops

Drag the self-loop arrowhead to another side of the state to move the loop.

## Reset edge routing

Select a transition and click:

```text
Reset automatic routing
```

---

# Known Limitations

- Nested aliases are not supported
- Boolean simplification is not implemented
- Transition coverage analysis is not yet implemented
- Verilog export is not yet implemented

---

# Future Features

Planned future enhancements include:

- `.gv` import
- Verilog export
- Coverage visualization
- Undo/redo history stack
- Auto-layout reset button
- SVG/PNG export
- Example gallery

---

# Need Help?

If the Validation panel reports errors:

1. Check signal declarations
2. Check alias names
3. Ensure multibit signals are declared with `[n]`
4. Ensure aliases do not reference other aliases
5. Ensure transition actions assign declared outputs

