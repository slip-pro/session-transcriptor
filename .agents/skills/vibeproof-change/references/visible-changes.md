# Visible changes

Use when a change affects what people see or operate. It adds checks, not a role or an interview.

**Start from the project's design.** Read its real design source, tokens and component examples
before choosing styles, and keep documented exceptions. Point to that source rather than copying it;
if there is none, extract a short design-language note from the existing UI. Reuse components and
tokens. Changing the design language is a decision; a change within it is simply shown. Respect a
stated wish to be asked about every visual change.

**A new interface** gets three genuinely different compositions at the first screen, each with what it
borrows from a reference (hierarchy, density, imagery, type) and why it fits this audience. Recommend
one. Don't import another brand's palette or fonts. If they delegate the choice, choose and record
it. Missing design tools are never a dead end. For an established brand, show how the edit fits
instead of restarting the direction.

**Sketch before agreeing** when a new or reworked screen or flow is hard to judge from words. Offer
once: a text layout, a diagram or a static `product/changes/C-<n>/sketch.html` with the real copy.
The compositions above can be that sketch. If they decline, stay in text. Nothing is built from a
sketch: the brief stays the contract, and the build follows the project's design, not the sketch.

**Let the product's job shape the layout**: no invented testimonials, no stock dashboards. Keep the
density, type and keyboard flow of an existing compact screen. Design with the real copy, including
long labels and honest empty and error states. A static copy edit needs only normal and long-text
checks, not invented states.

**Check the result at the real entry point**, not a component alone, with safe local data:
- phone and desktop widths, no overflow at 320 px, long labels;
- keyboard reach, visible focus, accessible names; contrast and reduced motion where relevant;
- loading finishes, errors are visible and recoverable, disabled controls don't act.

Capture before and after at both widths when a previous screen exists. A screenshot taken during the
run is not the "before", and one screenshot doesn't prove every state. Name each state or width by
what was actually exercised. Inspect the rendering yourself: visual judgement advises, failed
assertions block. Say what automated accessibility checks can't prove; never claim compliance.

**Tools.** Pin design and visual tools behind the project's lockfile: no unversioned `npx`, no
downloads during checks. Take comparison baselines from agreed history and never overwrite one
automatically after a failure. A passing lint doesn't authorize new tokens. Repeat a real trial when
a tool's pin changes. If a tool is unavailable, record the gap.
