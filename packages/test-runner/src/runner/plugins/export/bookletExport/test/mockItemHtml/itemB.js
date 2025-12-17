// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export default `
<img width="50px" height="30%" src="data:image/png;base64,abcd">
<style>
    .myitalic {
        font-style: italic;
    }
    .mybold {
        font-weight: bold;
    }
    .mycenter {
        text-align: center;
    }
    .myright {
        text-align: right;
    }
    .myunderline {
        text-decoration-line: underline;
    }
    .myfont {
        font-family: 'Times New Roman';
    }
    .mycolor {
        color: red;
    }
</style>
<p class="myitalic">Italic self</p>
<p class="mybold">Bold self</p>
<p class="myunderline">Underline self (in jest, text-decoration shorthand doesn't get split into parts)</p>
<p class="mycenter">Centered self</p>
<p class="myright mybold">Right-align, bold</p>
<p style="text-decoration-line: line-through; text-align: justify">Justified, line-through</p>
<p class="myfont">Font self</p>
<p class="mycolor">Ignored</p>
<div>
    In Jest, inherited styles are not inherited. Check that in real browser.
    <div style="color: red">
        ignored-level-1
        <div style="font-weight: 700">bold-level-2</div>
        <div style="border: 1px solid green">ignored-level-2</div>
    </div>
    <div style="font-style: italic">
        italic-level-1
        <div style="font-weight: bold">
            bold-level-2
            <div style="font-weight: 700">bold-level-3</div>
        </div>
        <div style="font-style: normal">normal-level-2</div>
        <div style="font-style: italic">
            italic-level-2
            <div>
                inherit-level-3
                <div style="font-style: normal">
                    normal-level-4
                    <div style="font-style: normal">
                        normal-level-5
                        <div style="font-style: italic">italic-level-6</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div style="text-align: center; font-family: Impact">
        font1-level-1
        <div style="text-decoration-line: underline">
            underline-level-2
            <div style="text-decoration-line: underline">underline-level-3</div>
            <div style="font-family: 'Times New Roman'">
                font2-level-3
                <div style="font-family: Impact">font1-level-4</div>
            </div>
        </div>
        <div style="font-family: 'Times New Roman'">
            font2-level-2
            <div style="font-family: Impact">font1-level-3</div>
        </div>
    </div>
</div>

 `;
