// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export const main = `
<div class="grid-row">
      <div class="col-12">
        <div class="qti-interaction qti-blockInteraction qti-customInteraction " data-qti-class="customInteraction" data-response-id="RESPONSE"> <div>
              <div class="unit-container">
                <iframe class="iframe1" src="about:blank"></iframe>
              </div>
            </div></div>
       </div>
     </div>
`;

export const iframe1Head = `
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title></title>
        <link rel="stylesheet" class="xx" type="text/css" media="screen" href="blob:http://localhost:8020/7dbb4d69-2ab7-40ad-9332-be2027288b78">
        <link rel="stylesheet" class="yy" type="text/css" media="screen" href="blob:http://localhost:8020/19634fa3-f27a-477b-b202-c9c74a1669dd">
        <style>
            body {
                margin: 0;
            }

            .icontainer {
                display: flex;
                width: 400px;
                height: 200px; /* 768 - 50 */
            }

            .mybold {
                font-weight: bold;
            }
        </style>
`;
export const iframe1Body = `
        <div class="icontainer">
          <p class="mybold">Is this bold?</p>
          <iframe class="iframe2" src="about:blank"></iframe>
          <iframe class="iframe3" src="about:blank"></iframe>
          <iframe class="iframe4" src="about:blank"></iframe>
          <!--<iframe class="iframe5" src="about:blank"></iframe>-->
        </div>
<script src="blob:http://localhost:8020/b3445b28-475f-411d-8a4e-8140042027ec"></script>
`;

export const iframe2Head = `
<script>
            window.hello = {"xx":"yy"};
            window.currentPageName = "Hello";
        </script><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title></title><link type="text/css" href="blob:http://localhost:8020/4f1e7097-6628-4527-8645-132354e567af" rel="stylesheet" charset="utf-8"><link type="text/css" href="blob:http://localhost:8020/48d9a8e2-898e-4ff1-a270-76c6c68c48cc" rel="stylesheet" charset="utf-8"><script src="blob:http://localhost:8020/59fbf782-3b54-42d4-b4b9-9e85256e707f"></script><script src="blob:http://localhost:8020/d0dbc729-d42b-4656-9a8f-3d6e3ad5b408"></script><script src="blob:http://localhost:8020/ec1fdb07-7c7d-4145-bb18-30c3ddee0d02"></script><script src="blob:http://localhost:8020/771d8393-c77e-4e1e-9b4f-4b82ba45d272"></script><script src="blob:http://localhost:8020/913786ea-9371-4e1c-9137-a231282ab9cc"></script>`;
export const iframe2Body = `<div id="Q01itemTitle" class="itemTitle" ><em>Hello</em><br>Question <span class="question_number">1</span> / <span class="question_number_total">5</span></div><div id="Q01itemDirections" class="itemDirections" >Refer to “text” on the right. Click on a choice.</div><div id="Q01itemStem" class="itemStem"><p >When was it recognized?</p><div class="radioDistractor" id="q01d0"><input type="radio" name="R540Q01RADIO" id="R540Q01RADIO_0" value="0" class="radio"><label for="R540Q01RADIO_0" >In the past.</label></div><div class="radioDistractor" id="q01d1"><input type="radio" name="R540Q01RADIO" id="R540Q01RADIO_1" value="1" class="radio"><label for="R540Q01RADIO_1" >In the future.</label></div><div class="radioDistractor" id="q01d2"><input type="radio" name="R540Q01RADIO" id="R540Q01RADIO_2" value="2" class="radio"><label for="R540Q01RADIO_2" >Today.</label></div><div class="radioDistractor" id="q01d3"><input type="radio" name="R540Q01RADIO" id="R540Q01RADIO_3" value="3" class="radio"><label for="R540Q01RADIO_3" >Never.</label></div></div>`;

export const iframe3Head = `<script>
            window.url_vars_controler = {"ModuleId":"stimulus"};
            window.currentPageName = "R540-BuildingALegend_item1_stimulus";
        </script><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title></title><link type="text/css" href="blob:http://localhost:8020/553631aa-cf40-40ba-8780-ff5a21577641" rel="stylesheet" charset="utf-8"><link type="text/css" href="blob:http://localhost:8020/99a8da92-16ba-4afa-af8e-1c3ebb6e03e5" rel="stylesheet" charset="utf-8"><script src="blob:http://localhost:8020/c3ecf099-e7f5-466c-9dec-cbd2c32647cb"></script><script src="blob:http://localhost:8020/a022ecf2-2cbe-4a63-a270-55e6b178c758"></script>
`;
export const iframe3Body = `<div id="pageWrapper"><h1 id="title" >Whatever</h1><div id="page1Div"><p id="p0" >Throughout history, "more commonly known"<img src="http://xxx.yy/mysrc1.jpg"></p><h2 id="subTitle1" >as someting</h2></div></div>
`;
