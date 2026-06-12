---
theme: default
layout: default
---

# Text annimation component

## <text-typewriter duration="3000" delay="1000" cursor>This text is being typed...</text-typewriter>

Can we do it in a header? <fade-in direction="right" duration="2000" delay="1000" distance="1000">Fading in from right</fade-in>

This is some text <dt-hide>with important</dt-hide><dt-show><text-highlight highlight-color="rgba(250, 204, 21, 0.5)" direction="center-out">with important</text-highlight></dt-show> information.

<dt-show>

<fade-in direction="none" duration="2000">Fading in after click</fade-in>
<fade-in absolute direction="none" duration="2000">
<dt-arrow x1="0" y1="270" x2="640" y2="270" line-color="#b18a00" line-width="3" arrow-head="start"></dt-arrow>
</fade-in>

</dt-show>
