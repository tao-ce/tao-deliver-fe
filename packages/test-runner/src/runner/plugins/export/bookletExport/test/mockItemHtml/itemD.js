// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export default `
<div class="grid-row">
  <div class="col-7">
    <p class="inline-interaction-container">One of the guitar players, <span class="qti-interaction qti-inlineInteraction qti-inlineChoiceInteraction svelte-vz9f1q" data-qti-class="inlineChoiceInteraction">
    <span class="select height-small svelte-1pngzft valid" style="--list-width: 15rem; --visible-options: 999; --space-above: 0px;">
      <button type="button" aria-expanded="false" aria-haspopup="listbox" aria-roledescription="Dropdown" aria-label="" title="" class="svelte-1pngzft">
        <span class="svelte-1pngzft dropdown-placeholder"></span>
        <svg class="icon medium svelte-5mmgb5" viewBox="0 0 16 16" aria-hidden="true">
          <title>Down arrow icon</title>
          <path d="M15.46 4.29A.51.51 0 0015 4H1a.5.5 0 00-.38.83l7 8a.51.51 0 00.76 0l7-8a.51.51 0 00.08-.54z" class="svelte-5mmgb5"></path>
        </svg>
      </button>
      <span class="listbox-wrapper svelte-1pngzft has-bottom-shadow has-top-shadow">
        <span class="listbox svelte-1pngzft" tabindex="-1" role="listbox" aria-activedescendant="tao-option-jr33g30r" aria-roledescription="dropdown list">
          <span class="scroll-child svelte-1pngzft"></span>
          <span class="option svelte-1pngzft selected blank" id="tao-option-jr33g30r" role="option" aria-selected="true">leave blank</span>
          <span class="option svelte-1pngzft" id="tao-option-lh6apfqy" role="option" aria-selected="false">John Lennon</span>
          <span class="option svelte-1pngzft" id="tao-option-xjwl71aa" role="option" aria-selected="false">Paul McCartney</span>
          <span class="option svelte-1pngzft" id="tao-option-0yzletu6" role="option" aria-selected="false">George Harrison</span>
          <span class="option svelte-1pngzft" id="tao-option-z69xv7hl" role="option" aria-selected="false">Ringo Starr</span>
          <span class="scroll-child svelte-1pngzft"></span>
        </span>
      </span>
      <input type="hidden" data-type="select" value="">
    </span>
  </span> was a founding member and also one of the two main composers. He wrote most of the Beatles' hits together with <span class="qti-interaction qti-inlineInteraction qti-inlineChoiceInteraction svelte-vz9f1q" data-qti-class="inlineChoiceInteraction">
    <span class="select height-small svelte-1pngzft valid" style="--list-width: 15rem; --visible-options: 999; --space-above: 0px;">
      <button type="button" aria-expanded="false" aria-haspopup="listbox" aria-roledescription="Dropdown" aria-label="" title="" class="svelte-1pngzft">
        <span class="svelte-1pngzft dropdown-placeholder"></span>
        <svg class="icon medium svelte-5mmgb5" viewBox="0 0 16 16" aria-hidden="true">
          <title>Down arrow icon</title>
          <path d="M15.46 4.29A.51.51 0 0015 4H1a.5.5 0 00-.38.83l7 8a.51.51 0 00.76 0l7-8a.51.51 0 00.08-.54z" class="svelte-5mmgb5"></path>
        </svg>
      </button>
      <span class="listbox-wrapper svelte-1pngzft has-bottom-shadow has-top-shadow">
        <span class="listbox svelte-1pngzft" tabindex="-1" role="listbox" aria-activedescendant="tao-option-7tzqnbtk" aria-roledescription="dropdown list">
          <span class="scroll-child svelte-1pngzft"></span>
          <span class="option svelte-1pngzft selected blank" id="tao-option-7tzqnbtk" role="option" aria-selected="true">leave blank</span>
          <span class="option svelte-1pngzft" id="tao-option-e4jw55mo" role="option" aria-selected="false">John Lennon</span>
          <span class="option svelte-1pngzft" id="tao-option-7ntyioiu" role="option" aria-selected="false">Paul McCartney</span>
          <span class="option svelte-1pngzft" id="tao-option-fcuwprbc" role="option" aria-selected="false">George Harrison</span>
          <span class="option svelte-1pngzft" id="tao-option-ipgyy8d0" role="option" aria-selected="false">Ringo Starr</span>
          <span class="scroll-child svelte-1pngzft"></span>
        </span>
      </span>
      <input type="hidden" data-type="select" value="">
    </span>
  </span>, the bass player.&nbsp; </p>
</div>
</div>

Dropdown PCI (select)

<div><select><option value="0">Select</option><option value="1">Sample A</option><option value="2">Sample B</option><option value="3">Sample C</option><option value="4">Sample D</option></select></div>

Choice Radio QTI

<div class="qti-interaction qti-blockInteraction qti-choiceInteraction " data-qti-class="choiceInteraction" role="group" aria-labelledby="tao-prompt-xccaw2ct">
  <div class="qti-prompt ui-heading-l cf svelte-108wmin" id="tao-prompt-xccaw2ct">
    <p>He wants to reply to the question.</p>
    <p>What advice should he post?</p>
  </div>
  <div class="qti-instruction-container svelte-60ttlb" lang="en" dir="ltr"></div>
  <div class="selectable-choice-container svelte-16os4in" role="group" aria-roledescription="selectablechoice">
    <ul class="vertical svelte-16os4in">
      <span class="hidden" id="tao-choice-label-e3ga9ekc">
        <span class="caption-container svelte-1tppddh">
          <span class="choice-content svelte-1tppddh">
            <p>Place the pot in water.</p>
          </span>
        </span>
      </span>
      <li class="svelte-1tppddh controls radio" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="radio" name="tao-choice-interaction-3qmuclsh" value="A" aria-labelledby="tao-choice-label-e3ga9ekc" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="caption-container svelte-1tppddh">
              <span class="choice-content svelte-1tppddh">
                <p>Place the pot in water.</p>
              </span>
            </span>
          </span>
        </label>
      </li>
      <span class="hidden" id="tao-choice-label-duif3dxr">
        <span class="caption-container svelte-1tppddh">
          <span class="choice-content svelte-1tppddh">Place water in the pot. </span>
        </span>
      </span>
      <li class="svelte-1tppddh controls radio" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="radio" name="tao-choice-interaction-3qmuclsh" value="B" aria-labelledby="tao-choice-label-duif3dxr" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="caption-container svelte-1tppddh">
              <span class="choice-content svelte-1tppddh">Place water in the pot. </span>
            </span>
          </span>
        </label>
      </li>
      <span class="hidden" id="tao-choice-label-oizl4w4l">
        <span class="caption-container svelte-1tppddh">
          <span class="choice-content svelte-1tppddh">Pour pot in the water. </span>
        </span>
      </span>
      <li class="svelte-1tppddh controls radio" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="radio" name="tao-choice-interaction-3qmuclsh" value="C" aria-labelledby="tao-choice-label-oizl4w4l" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="caption-container svelte-1tppddh">
              <span class="choice-content svelte-1tppddh">Pour pot in the water. </span>
            </span>
          </span>
        </label>
      </li>
      <span class="hidden" id="tao-choice-label-uwu1c8vw">
        <span class="caption-container svelte-1tppddh">
          <span class="choice-content svelte-1tppddh">Pour water in the pot. </span>
        </span>
      </span>
      <li class="svelte-1tppddh controls radio" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="radio" name="tao-choice-interaction-3qmuclsh" value="choice_1" aria-labelledby="tao-choice-label-uwu1c8vw" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="caption-container svelte-1tppddh">
              <span class="choice-content svelte-1tppddh">Pour water in the pot. </span>
            </span>
          </span>
        </label>
      </li>
    </ul>
  </div>
</div>

Choice Radio PCI (input type radio)

<div><p id="Q02p1">Which one of the following geometric figures could be the one Paul built?</p><div id="Q02ImgWrapperDiv"><div id="ULQ02ImgDiv" class="Q02ImgesDivCls"><div class="radioDistractor" id="Q02d0"><input spellcheck="false" autocomplete="off" type="radio" name="M101Q02RADIO" id="M101Q02RADIO_0" value="0" class="radio"> <label for="M101Q02RADIO_0"><img src="data:image/png;base64,iVB="></label></div></div><div id="URQ02ImgDiv" class="Q02ImgesDivCls"><div class="radioDistractor" id="Q02d1"><input spellcheck="false" autocomplete="off" type="radio" name="M101Q02RADIO" id="M101Q02RADIO_1" value="1" class="radio"> <label for="M101Q02RADIO_1"><img src="data:image/png;base64,iVBO"></label></div></div><div id="LLQ02ImgDiv" class="Q02ImgesDivCls"><div class="radioDistractor" id="Q02d2"><input spellcheck="false" autocomplete="off" type="radio" name="M101Q02RADIO" id="M101Q02RADIO_2" value="2" class="radio"> <label for="M101Q02RADIO_2"><img src="data:image/png;base64,iVBOR="></label></div></div><div id="LRQ02ImgDiv" class="Q02ImgesDivCls"><div class="radioDistractor" id="Q02d3"><input spellcheck="false" autocomplete="off" type="radio" name="M101Q02RADIO" id="M101Q02RADIO_3" value="3" class="radio"> <label for="M101Q02RADIO_3"><img src="data:image/png;base64,iVBORw"></label></div></div></div></div>

<table class="greytable"><tbody><tr><th class="alignLeft" id="q09tr1th1">Does the statement describe a way?</th><th id="q09tr1th2">Yes</th><th id="q09tr1th3">No</th></tr><tr><td id="q09tr3td1">Both mention ways.</td><td id="q09tr3td2" class="greytableRadio"><input type="radio" name="R549Q13RADIO_2" id="R549Q13RADIO_2_1" value="0"></td><td id="q09tr3td3" class="greytableRadio"><input type="radio" name="R549Q13RADIO_2" id="R549Q13RADIO_2_2" value="1"></td></tr><tr><td id="q09tr4td1">Both show how.</td><td id="q09tr4td2" class="greytableRadio"><input type="radio" name="R549Q13RADIO_3" id="R549Q13RADIO_3_1" value="0"></td><td id="q09tr4td3" class="greytableRadio"><input type="radio" name="R549Q13RADIO_3" id="R549Q13RADIO_3_2" value="1"></td></tr><tr><td id="q09tr5td1">Both advertise.</td><td id="q09tr5td2" class="greytableRadio"><input type="radio" name="R549Q13RADIO_4" id="R549Q13RADIO_4_1" value="0"></td><td id="q09tr5td3" class="greytableRadio"><input type="radio" name="R549Q13RADIO_4" id="R549Q13RADIO_4_2" value="1"></td></tr></tbody></table>

Choice Checkbox QTI

<style>
    .myitalic {font-style: italic}
    .mybold {font-weight: bold}
</style>

<div class="qti-interaction qti-blockInteraction qti-choiceInteraction " data-qti-class="choiceInteraction" role="group" aria-labelledby="tao-prompt-grenj0ci">
  <div class="qti-prompt ui-heading-l cf svelte-108wmin" id="tao-prompt-grenj0ci">
    <div>
      <img src="data:image/png;base64,iVB=" alt="European Union" width="32" height="32">
      <strong>&nbsp;Please select the flags of the European Unnion countries&nbsp; belonging to the Schengen Area : </strong>
    </div>
    <div>&nbsp;</div>
  </div>
  <div class="qti-instruction-container svelte-60ttlb" lang="en" dir="ltr">
    <div aria-atomic="true" role="status" class="feedback info svelte-1ssbf9n fullwidth">
      <p class="svelte-1ssbf9n">You need to select 12 choices</p>
    </div>
  </div>
  <div class="selectable-choice-container svelte-16os4in" role="group" aria-roledescription="selectablechoice">
    <ul class="horizontal svelte-16os4in">
      <span class="hidden" id="tao-choice-label-lpm93fno">
        <span class="image-container svelte-1tppddh">
          <img src="http://xxx.yy/mysrc1.jpg" alt="Belgium" width="32" height="32" class="svelte-1tppddh">
        </span>
      </span>
      <li class="svelte-1tppddh has-image no-caption controls" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="checkbox" name="tao-choice-interaction-n17q5hwi" value="be" aria-labelledby="tao-choice-label-lpm93fno" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="image-container svelte-1tppddh">
              <img src="http://xxx.yy/mysrc1.jpg" alt="Belgium" width="32" height="32" class="svelte-1tppddh">
            </span>
          </span>
        </label>
      </li>
      <span class="hidden" id="tao-choice-label-1tdb08iu">
        <span class="image-container svelte-1tppddh">
          <img src="http://xxx.yy/mysrc2.jpg" alt="Germany" width="32" height="32" class="svelte-1tppddh">
        </span>
      </span>
      <li class="svelte-1tppddh has-image no-caption controls" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="checkbox" name="tao-choice-interaction-n17q5hwi" value="de" aria-labelledby="tao-choice-label-1tdb08iu" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="image-container svelte-1tppddh">
              <img src="http://xxx.yy/mysrc2.jpg" alt="Germany" width="32" height="32" class="svelte-1tppddh">
            </span>
          </span>
        </label>
      </li>
      <span class="hidden" id="tao-choice-label-otdvlrux">
        <span class="image-container svelte-1tppddh">
          <img src="http://xxx.yy/mysrc3.jpg" alt="France" width="32" height="32" class="svelte-1tppddh">
        </span>
      </span>
      <li class="svelte-1tppddh has-image no-caption controls" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="checkbox" name="tao-choice-interaction-n17q5hwi" value="fr" aria-labelledby="tao-choice-label-otdvlrux" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="image-container svelte-1tppddh">
              <img src="http://xxx.yy/mysrc3.jpg" alt="France" width="32" height="32" class="svelte-1tppddh">
            </span>
          </span>
        </label>
      </li>
    </ul>
  </div>
</div>

<div class="qti-interaction qti-blockInteraction qti-choiceInteraction " data-qti-class="choiceInteraction" id="interaction" role="group" aria-labelledby="tao-prompt-6qmtzmgl">
  <div class="qti-prompt ui-heading-l cf svelte-108wmin" id="tao-prompt-6qmtzmgl">Which was the last Space Shuttle going into space during the STS-135 mission in July 2011?</div>
  <div class="qti-instruction-container svelte-60ttlb"></div>
  <div class="selectable-choice-container svelte-16os4in" role="group" aria-roledescription="selectablechoice">
    <ul class="vertical svelte-16os4in">
      <span class="hidden" id="tao-choice-label-oscsbbfq">
        <span class="caption-container svelte-1tppddh">
          <span class="choice-content svelte-1tppddh">
            <div class="shadows svelte-1dly2d3" style="height: auto; width: auto;">
              <div class="shadow left svelte-1dly2d3 hidden"></div>
              <div class="shadow right svelte-1dly2d3 hidden"></div>
              <div class="shadow top svelte-1dly2d3 hidden"></div>
              <div class="shadow bottom svelte-1dly2d3 hidden"></div>
              <div class="scrollable-wrapper svelte-1dly2d3" tabindex="0" style="height: auto; width: auto;">
                <table class="svelte-ci2amv">
                  <caption>Sample</caption>
                  <thead>
                    <tr>
                      <th>&nbsp;</th>
                      <th>15</th>
                      <th>15</th>
                      <th>15</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>15</th>
                      <td>4</td>
                      <td>9</td>
                      <td>2</td>
                    </tr>
                    <tr>
                      <th>15</th>
                      <td>3</td>
                      <td>5</td>
                      <td>7</td>
                    </tr>
                    <tr>
                      <th>15</th>
                      <td>8</td>
                      <td>1</td>
                      <td>6</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </span>
        </span>
      </span>
      <li class="svelte-1tppddh controls radio" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="radio" name="tao-choice-interaction-pix7ef57" value="Discovery" aria-labelledby="tao-choice-label-oscsbbfq" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="caption-container svelte-1tppddh">
              <span class="choice-content svelte-1tppddh">
                <div class="shadows svelte-1dly2d3" style="height: auto; width: auto;">
                  <div class="shadow left svelte-1dly2d3 hidden"></div>
                  <div class="shadow right svelte-1dly2d3 hidden"></div>
                  <div class="shadow top svelte-1dly2d3 hidden"></div>
                  <div class="shadow bottom svelte-1dly2d3 hidden"></div>
                  <div class="scrollable-wrapper svelte-1dly2d3" tabindex="0" style="height: auto; width: auto;">
                    <table class="svelte-ci2amv">
                      <caption>Sample</caption>
                      <thead>
                        <tr>
                          <th>&nbsp;</th>
                          <th>15</th>
                          <th>15</th>
                          <th>15</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th>15</th>
                          <td>4</td>
                          <td>9</td>
                          <td>2</td>
                        </tr>
                        <tr>
                          <th>15</th>
                          <td>3</td>
                          <td>5</td>
                          <td>7</td>
                        </tr>
                        <tr>
                          <th>15</th>
                          <td>8</td>
                          <td>1</td>
                          <td>6</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </span>
            </span>
          </span>
        </label>
      </li>
      <span class="hidden" id="tao-choice-label-ctpx241n">
        <span class="caption-container svelte-1tppddh">
          <span class="choice-content svelte-1tppddh">
            <i>Challenger <i>
                <b>here</b>
              </i>
            </i>
          </span>
        </span>
      </span>
      <li class="svelte-1tppddh controls radio" style="--stacking: 0;">
        <label class="svelte-1tppddh">
          <input type="radio" name="tao-choice-interaction-pix7ef57" value="Challenger" aria-labelledby="tao-choice-label-ctpx241n" class="svelte-1tppddh">
          <span class="container svelte-1tppddh">
            <span class="caption-container svelte-1tppddh">
              <span class="choice-content svelte-1tppddh">
                <i>Challenger <i>
                    <b>here</b>
                  </i>
                </i>
              </span>
            </span>
          </span>
        </label>
      </li>
    </ul>
  </div>
</div>

Choice Checkbox PCI (input type checkbox)

<div id="itemStem1" class="itemStem"><p id="q1p2">✔ Remember to select <b>one or more</b></p><div class="checkboxDistractor" id="d0"><input spellcheck="false" autocomplete="off" type="checkbox" id="aM102Q01CHX_0" value="0"><label for="aM102Q01CHX_0">5 stars</label></div><div class="checkboxDistractor" id="d1"><input spellcheck="false" autocomplete="off" type="checkbox" id="aM102Q01CHX_1" value="0"><label for="aM102Q01CHX_1">4 stars</label></div><div class="checkboxDistractor" id="d2"><input spellcheck="false" autocomplete="off" type="checkbox" id="aM102Q01CHX_2" value="0"><label for="aM102Q01CHX_2">3 stars</label></div></div>

<div id="itemStem1" class="itemStem"><p id="q1p2">✔ Remember to select <b>one or more</b></p><div class="checkboxDistractor" id="d0"><input spellcheck="false" autocomplete="off" type="checkbox" id="bM102Q01CHX_0" value="0" name="mygroup-abc"><label for="bM102Q01CHX_0">5 stars</label></div><div class="checkboxDistractor" id="d1"><input spellcheck="false" autocomplete="off" type="checkbox" id="bM102Q01CHX_1" value="0" name="mygroup-abc"><label for="bM102Q01CHX_1">4 stars</label></div><div class="checkboxDistractor" id="d2"><input spellcheck="false" autocomplete="off" type="checkbox" id="bM102Q01CHX_2" value="0" name="mygroup-abc"><label for="bM102Q01CHX_2">3 stars</label></div></div>

<div id="itemStem1" class="itemStem"><p id="q1p2">✔ Remember to select <b>one or more</b></p><div class="checkboxDistractor" id="d0"><input spellcheck="false" autocomplete="off" type="checkbox" id="cM102Q01CHX_0" value="0" name="mygroup-123"><label for="cM102Q01CHX_0">5 stars</label></div><p>Stray content got here</p><div class="checkboxDistractor" id="d1"><input spellcheck="false" autocomplete="off" type="checkbox" id="cM102Q01CHX_1" value="0" name="mygroup-123"><label for="cM102Q01CHX_1">4 stars</label></div><div class="checkboxDistractor" id="d2"><input spellcheck="false" autocomplete="off" type="checkbox" id="cM102Q01CHX_2" value="0" name="mygroup-123"><label for="cM102Q01CHX_2">3 stars</label></div></div>

MathEntry PCI

<div class="qti-interaction qti-blockInteraction qti-customInteraction " data-type-identifier="mathEntryInteraction" data-qti-class="customInteraction" data-response-id="RESPONSE">
  <div>
    <div class="mathEntryInteraction">
      <div class="prompt">
        <strong>Please enter some math:</strong>
      </div>
      <div class="math-entry">
        <div class="toolbar"><div class="math-entry-toolgroup" data-identifier="functions"><div class="math-entry-tool" data-identifier="frac" data-latex="\frac" data-fn="cmd">x/y</div></div></div><div class="math-entry-placeholder" style="display: none;"></div>
        <div>
          <span class="math-entry-input mq-editable-field mq-math-mode" data-allow-copy="true" style="display: block;"><span class="mq-textarea"><textarea autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" x-palm-disable-ste-all="true"></textarea></span><span class="mq-root-block mq-empty" mathquill-block-id="4"></span></span>
        </div>
      </div>
    </div>
  </div>
</div>
`;
