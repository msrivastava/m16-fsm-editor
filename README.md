M16 FSM Editor

Interactive browser-based visual editor for creating, editing, validating, and exporting finite state machines (FSMs) compatible with the fsm2logisim toolchain used in UCLA ECE M16 / CS M51A.

The editor provides:

* Interactive FSM graph editing
* Graphical state and transition manipulation
* Live .gv generation
* Friendly multibit expressions and assignments
* Alias support
* FSM validation
* Project save/load with layout preservation
* Export to fsm2logisim-compatible Graphviz .gv

⸻

Live Demo

The editor is hosted using GitHub Pages:

https://msrivastava.github.io/m16-fsm-editor/

No installation is required for normal use.

⸻

Background

This editor was developed as a visual front-end for the fsm2logisim workflow.

The original fsm2logisim tool accepts FSM descriptions written in a stylized Graphviz DOT / .gv format and generates Logisim circuits implementing the FSM.

The goal of this editor is to let students:

* Draw FSMs visually
* Edit transitions interactively
* Validate FSM structure
* Export directly into the .gv format expected by fsm2logisim

while still preserving compatibility with the existing course infrastructure.

⸻

Features

FSM Editing

* Add/delete states
* Add/delete transitions
* Rename states
* Select start state
* Edit transition conditions
* Edit Mealy outputs/actions
* Edit Moore outputs/actions
* Drag states to reposition them
* Reconnect transitions interactively
* Manually route self-loops and transition handles

Signals

* Editable input/output declarations
* Support for multibit signals:

x[4]
y[8]

Friendly Multibit Expressions

The editor supports convenient multibit syntax while internally exporting expanded bit-level expressions.

Supported assignment forms

y = 2'b10
y = 0b10
y = 0x2
y = 2

Supported condition forms

x == 2'b10
x != 0x0
x == 3

These are automatically expanded into bit-level expressions in exported .gv files.

Aliases

Aliases may be defined using friendly syntax.

Example:

a1: x == 0x2
y10: y=2'b10

Transitions and actions may reference aliases:

{a1}
{y10}

Nested aliases are intentionally disallowed.

Validation

The editor performs validation and reports:

* Unknown states
* Duplicate signals
* Missing aliases
* Invalid multibit usage
* Unknown inputs/outputs
* Invalid alias definitions
* Invalid .gv export conditions

Validation is non-blocking.

Project Save/Load

Projects can be saved and reloaded using:

* .fsm.json

This preserves:

* FSM model
* Node positions
* Manual routing information
* Friendly text expressions
* Aliases

⸻

Exported .gv Compatibility

The generated .gv files are compatible with the existing fsm2logisim toolchain.

The exported format supports:

* Mealy FSMs
* Moore FSMs
* Multibit indexed signals
* Aliases
* Graphviz visualization

Example exported transition:

A -> B [ label = "(~x[0]&x[1]) / y[0]=0,y[1]=1" ];

⸻

Development

Requirements

* Node.js 20+
* npm

Install

npm install

Run locally

npm run dev

The development server will usually start at:

http://localhost:5173/

Build

npm run build

Preview production build

npm run preview

⸻

Repository Structure

src/
  components/
    FsmStateNode.tsx
    FsmTransitionEdge.tsx
    SelfLoopEdge.tsx
  fsm/
    examples.ts
    gvExport.ts
    model.ts
  App.tsx
  App.css

⸻

Technology Stack

* React
* TypeScript
* Vite
* React Flow (@xyflow/react)
* Dagre graph layout

⸻

Notes on Routing

The editor automatically allocates edge handles to reduce overlap.

Users may also manually reconnect transitions to:

* Different states
* Different handle locations on the same state

Manual routing information is stored only in project JSON files and does not affect .gv export.

⸻

Current Limitations

* Alias expansion currently targets .gv export only
* Nested aliases are not supported
* Transition coverage analysis is not yet implemented
* Boolean simplification/minimization is not yet implemented
* Verilog export is not yet implemented

⸻

Planned Features

Potential future enhancements include:

* Import existing .gv files
* Verilog export
* Enhanced FSM validation
* Coverage analysis
* Undo/redo history stack
* Auto-layout reset button
* Export to SVG/PNG
* Example gallery
* Moore/Mealy teaching modes

⸻

License

This project is intended primarily for instructional use in UCLA ECE M16 / CS M51A.

Please consult the repository owner regarding redistribution or derivative use.

⸻

Acknowledgments

This tool builds on the original fsm2logisim workflow and Graphviz-based FSM representation developed for UCLA digital logic courses.