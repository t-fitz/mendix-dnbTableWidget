/*global logger*/
/*
    WidgetName
    ========================

    @file      : dnbTableWidget.js
    @version   : 1.0
    @author    : Trevor Fitzgerald
    @company   : Dun & Bradstreet Ltd
    @date      : 10/06/2016
    @copyright : 2016
    @license   : Apache v2

    Documentation
    ========================
    Widget to customise Mendix tables.
    Functionality is:
    - show/hide columns
    - reorder columns
    - resize columns
    - save column layout to localstorage
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/_base/array",
    "dojo/on"
], function(declare, _WidgetBase, dojoArray, on) {
    "use strict";

    // Declare widget's prototype.
    return declare("dnbTableWidget.widget.dnbTableWidget", [_WidgetBase], {

        // DOM elements
        inputNodes: null,
        listNode: null,

        // Parameters configured in the Modeler.
        classnameString: "",
        btnString: "",
        titleString: "",
        showIconBoolean: true,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,

        tblOld: null,
        colArr: null,
        dragSrcEl: null,
        dragHTML: null,
        dropHTML: null,
        dragVis: null,
        dropVis: null,
        dragEnter: null,
        startPos: 0,
        moveIndex: 0,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            logger.debug(this.id + ".constructor");

            // set internal variables here to avoid them getting shared between widgets
            this._handles = [];
            this.colArr = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            this.tblOld = document.querySelector("." + this.classnameString + " .mx-datagrid-content-wrapper");
            //console.log(this.tblOld);

            // get saved column settings
            var savedColArr = this.getLocalStorage("dnbTblStyleList-" + this.classnameString);

            // get column settings
            if (savedColArr) {
                this.colArr = savedColArr;
                this.refreshTable(this.colArr, this.tblOld);
            } else {
                var tblHeader = this.tblOld.querySelectorAll(".mx-datagrid-head-table thead tr th");
                var tblHeaderColGroup = this.tblOld.querySelectorAll(".mx-datagrid-head-table colgroup col");

                // create columns object
                for (var i = 0; i < tblHeader.length; i++) {

                    var classList = (tblHeader[i].classList) ? tblHeader[i].classList : tblHeader[i].className.split(" ");

                    for (var j = 0; j < classList.length; j++) {
                        if (classList[j].substring(0, 8) == "mx-name-") {
                            this.colArr.push({
                                'col': tblHeader[i].querySelector(".mx-datagrid-head-caption").innerHTML,
                                'className': classList[j],
                                'isVisible': true,
                                'width': tblHeaderColGroup[i].style.width
                            });
                        }
                    }
                }
            }

            // build settings div
            this.inputNodes = document.createElement("div");
            this.inputNodes.id = "dnbTblTableSettings-" + this.classnameString;
            this._handles.push(on(this.inputNodes, "mouseleave", function(e) {
                this.inputNodes.style.display = "none";
            }.bind(this)));

            // build list
            this.listNode = document.createElement("ul");
            this.listNode.id = "dnbTblStyleList-" + this.classnameString;
            this.listNode.className = "dnbTblStyleList";
            this.inputNodes.appendChild(this.listNode);

            // initial hide of setting list
            this.inputNodes.style.display = "none";
            this.inputNodes.style.position = "absolute";

            // setting list show/hide button    
            var btnIcon = document.createElement("span");
            var btnText = document.createElement("span");
            btnIcon.className = "glyphicon glyphicon-cog dnbIcnCog";
            btnText.innerText = this.btnString;

            var btnShowHideList = document.createElement("button");
            btnShowHideList.id = "btnShowHideList-" + this.classnameString;
            btnShowHideList.className = "btn dnbBtnShowHideList";
            btnShowHideList.title = this.titleString;
            if (this.showIconBoolean) {
                btnText.className = "dnbBtnText";
                btnShowHideList.appendChild(btnIcon);
            }
            if (this.btnString != "") {
                btnShowHideList.appendChild(btnText);
            }
            this.tblOld.insertBefore(btnShowHideList, this.tblOld.firstChild);
            btnShowHideList.onclick = function(e) {
                this.showHideList(e.target);
            }.bind(this);

            //console.log(this.colArr);

            // initialiser for settings list
            this.buildList(this.colArr, this.listNode);
        },

        buildList: function(arr, list) {

            list.innerHTML = "";

            var self = this;

            dojoArray.forEach(arr, function(item, index) {
                var li = document.createElement("li");
                var txt = document.createTextNode(item.col);

                this._handles.push(on(li, "click", colShowHide));

                li.className = (item.isVisible) ? "dnbVisible glyphicon" : "dnbHidden glyphicon";
                li.appendChild(txt);
                li.draggable = true;

                list.appendChild(li);

                addEvents(li);
            }.bind(this));

            document.body.appendChild(this.inputNodes);

            // column show/hide function 
            function colShowHide(e) {

                var clickPos = Array.prototype.indexOf.call(e.target.parentNode.children, e.target);

                // change isVisible value
                self.colArr[clickPos].isVisible = (self.colArr[clickPos].isVisible) ? false : true;

                var nextColPos = -1;
                var prevColPos = -1;

                // get next col
                for (var i = clickPos + 1; i < self.colArr.length && nextColPos == -1; i++) {
                    if (self.colArr[i].isVisible && i != clickPos) {
                        nextColPos = i;
                    }
                }

                // find prev col pos
                for (var i = clickPos; i > -1 && prevColPos == -1; i--) {
                    if (self.colArr[i].isVisible && i != clickPos) {
                        prevColPos = i;
                    }
                }

                // check to make sure at least one column in the table
                if (nextColPos == -1 && prevColPos == -1) {
                    // undo isVisible change 
                    self.colArr[clickPos].isVisible = (self.colArr[clickPos].isVisible) ? false : true;
                    self.buildList(self.colArr, self.listNode);
                    return;
                }

                // change width of next/prev column
                var newColWidth = 0;

                if (!self.colArr[clickPos].isVisible) {
                    var nextPos = (nextColPos != -1) ? nextColPos : prevColPos;

                    newColWidth = parseFloat(self.colArr[clickPos].width.replace("%", "")) + parseFloat(self.colArr[nextPos].width.replace("%", ""));
                    self.colArr[clickPos].width = "0%";
                    self.colArr[nextPos].width = newColWidth + "%";
                } else {
                    var nextPos = (nextColPos != -1) ? nextColPos : prevColPos;

                    newColWidth = parseFloat(self.colArr[clickPos].width.replace("%", "")) + parseFloat(self.colArr[nextPos].width.replace("%", "")) / 2;
                    self.colArr[clickPos].width = newColWidth + "%";
                    self.colArr[nextPos].width = newColWidth + "%";
                }

                self.buildList(self.colArr, self.listNode);
                self.refreshTable(self.colArr, self.tblOld);
            }

            // add drag and drop event listeners
            function addEvents(li) {
                self._handles.push(on(li, "dragstart", handleDragStart));
                self._handles.push(on(li, "dragenter", handleDragEnter));
                self._handles.push(on(li, "dragover", handleDragOver));
                self._handles.push(on(li, "dragleave", handleDragLeave));
                self._handles.push(on(li, "drop", handleDrop));
                self._handles.push(on(li, "dragend", handleDragEnd));
                self._handles.push(on(li, "onmousedown", onMouseDown));
            }

            // for IE9-10
            function onMouseDown(e) {
                self.dragDrop();
                return false;
            }

            // drag and drop event functions
            function handleDragStart(e) {
                // this / e.target is the source node.
                self.dragSrcEl = e.target;
                self.dragHTML = e.target.innerHTML;
                self.dragVis = e.target.className.replace("glyphicon", "").replace(" ", "");

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text', e.target.innerText);
            }

            function handleDragOver(e) {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                if (e.preventDefault) {
                    e.preventDefault(); // Necessary. Allows us to drop.
                }

                e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.

                return false;
            }

            function handleDragEnter(e) {
                // this / e.target is the current hover target.
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                if (e.preventDefault) {
                    e.preventDefault(); // Necessary. Allows us to drop.
                }

                // check that we are dragging in the same list as the drag item
                if (self.dragSrcEl.parentNode.className != e.target.parentNode.className) {
                    return false;
                }

                self.dragEnter = e.target.nodeType;

                // check drag element is not a the LI text node
                if (e.target.nodeType != 3) {
                    self.dropVis = e.target.className.replace("glyphicon", "").replace(" ", "");

                    e.target.className = e.target.className.replace("dnbVisible", "");
                    e.target.className = e.target.className.replace("dnbHidden", "");
                    e.target.className = e.target.className.replace("dnbDragOver", "") + " dnbDragOver " + self.dragVis;

                    self.dropHTML = e.target.innerHTML;
                    e.target.innerHTML = self.dragHTML;
                }
            }

            function handleDragLeave(e) {
                // this / e.target is previous target element.

                // check that we are dragging in the same list as the drag item
                if (self.dragSrcEl.parentNode.className != e.target.parentNode.className) {
                    return false;
                }

                // check drag element is not a the LI text node
                if (e.target.nodeType != 3 && self.dragEnter != 3) {
                    e.target.className = e.target.className.replace("dnbVisible", "");
                    e.target.className = e.target.className.replace("dnbHidden", "");
                    e.target.className = e.target.className.replace("dnbDragOver", "") + " " + self.dropVis;

                    e.target.innerHTML = self.dropHTML;
                }
            }

            function handleDrop(e) {
                // this / e.target is current target element.
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                if (e.preventDefault) {
                    e.preventDefault(); // Necessary. Stops FF trying to forward to the dataTranfer.setData text value
                }

                // get position of moved element
                var startDragPos = Array.prototype.indexOf.call(self.dragSrcEl.parentNode.children, self.dragSrcEl);

                // get position of dropped into element
                var endDragPos = Array.prototype.indexOf.call(e.target.parentNode.children, e.target);

                // get dragged item
                var dItem = self.colArr[startDragPos];
                // remove dragged item
                delete self.colArr[startDragPos];
                // remove empty array slot
                self.colArr = dojoArray.filter(self.colArr, function(obj) {
                    if (obj && 'col' in obj) {
                        return true;
                    } else {
                        return false;
                    }
                });

                // place dragged item into endDragPos
                self.colArr.splice(endDragPos, 0, dItem);

                self.buildList(self.colArr, self.listNode);
                self.refreshTable(self.colArr, self.tblOld);

                return false;
            }

            function handleDragEnd(e) {
                // remove 'over' CSS class. return dragged item opacity to 1
                dojoArray.forEach(self.colArr, function(item, index) {
                    if (self.listNode.children[index].classList) {
                        self.listNode.children[index].classList.remove("dnbDragOver");
                    } else {
                        self.listNode.children[index].className = self.listNode.children[index].className.replace(/\bdnbDragOver/g, ""); // For IE9 and earlier
                    }
                }.bind(self));
            }
        },

        // restructure the table
        refreshTable: function(arr, tbl) {
            //console.log(arr);

            var currHeaderTable = tbl.querySelector(".mx-datagrid-content-wrapper .mx-datagrid-head-table thead tr");
            var currBodyTable = tbl.querySelectorAll(".mx-datagrid-content-wrapper .mx-datagrid-body-table tbody tr");

            var currHeaderColgroup = tbl.querySelectorAll(".mx-datagrid-content-wrapper .mx-datagrid-head-table colgroup col");
            var currBodyColgroup = tbl.querySelectorAll(".mx-datagrid-content-wrapper .mx-datagrid-body-table colgroup col");

            dojoArray.forEach(arr, function(item, index) {
                // change header
                var headItem = currHeaderTable.querySelector("th." + item.className);

                currHeaderColgroup[index].style.width = item.width;
                currBodyColgroup[index].style.width = item.width;

                headItem.querySelector(".mx-datagrid-head-wrapper").style.display = (item.isVisible) ? "" : "none";

                currHeaderTable.removeChild(headItem);
                currHeaderTable.appendChild(headItem);

                // change body
                for (var i = 0; i < currBodyTable.length; i++) {
                    var bodRow = currBodyTable[i];
                    var bodItem = bodRow.querySelector("td." + item.className);

                    bodRow.removeChild(bodItem);
                    bodRow.appendChild(bodItem);
                }
            }.bind(this));

            this.addColumnResizers(tbl, arr);

            // save new config
            this.setLocalStorage("dnbTblStyleList-" + this.classnameString, arr);
        },

        addColumnResizers: function(tbl, arr) {
            // remove old ones
            var oldResizers = tbl.querySelectorAll(".dnb-datagrid-column-resizer");

            if (oldResizers[0] == null) {
                oldResizers = tbl.querySelectorAll(".mx-datagrid-column-resizer");
            }

            for (var i = 0; i < oldResizers.length; i++) {
                oldResizers[i].parentNode.removeChild(oldResizers[i]);
            }

            // add new ones
            var tblHeaderWrapper = tbl.querySelectorAll(".mx-datagrid-head-wrapper");
            var needsResizer = false;

            for (var i = 0; i < tblHeaderWrapper.length; i++) {

                var self = this;

                if (arr[i].isVisible && needsResizer) {
                    var columnResizer = document.createElement("div");
                    columnResizer.className = "dnb-datagrid-column-resizer";

                    // add event listeners
                    self._handles.push(on(columnResizer, "click", function(e) {
                        e.preventDefault();
                    }));
                    self._handles.push(on(columnResizer, "mousedown", startResize));

                    tblHeaderWrapper[i].appendChild(columnResizer);
                } else if (arr[i].isVisible && !needsResizer) {
                    needsResizer = !needsResizer;
                }
            }

            var self = this;
            var bodyHandlers = [];

            function startResize(e) {
                document.body.style.cursor = "col-resize";

                bodyHandlers.push(on(document.body, "mousemove", moveResize));
                bodyHandlers.push(on(document.body, "mouseup", endResize));

                //console.log("start pos: " + e.pageX);
                self.startPos = e.pageX;
                self.moveIndex = Array.prototype.indexOf.call(e.target.parentNode.parentNode.parentNode.children, e.target.parentNode.parentNode);

                e.preventDefault();
            }

            function moveResize(e) {
                var col1Width = 0;
                var col1Index = self.moveIndex;

                do {
                    col1Index = col1Index - 1;
                    col1Width = self.tblOld.querySelectorAll(".mx-datagrid-head-table thead tr th")[col1Index].offsetWidth;
                } while (col1Width < 1);

                var col2Width = self.tblOld.querySelectorAll(".mx-datagrid-head-table thead tr th")[self.moveIndex].offsetWidth;

                var changeInPixels = e.pageX - self.startPos;
                self.startPos = e.pageX;

                var hCol1 = self.tblOld.querySelectorAll(".mx-datagrid-head-table colgroup col")[col1Index];
                var hCol2 = self.tblOld.querySelectorAll(".mx-datagrid-head-table colgroup col")[self.moveIndex];
                var bCol1 = self.tblOld.querySelectorAll(".mx-datagrid-body-table colgroup col")[col1Index];
                var bCol2 = self.tblOld.querySelectorAll(".mx-datagrid-body-table colgroup col")[self.moveIndex];

                // stop column width getting too small
                if ((col2Width - changeInPixels) > 35 && (col1Width + changeInPixels) > 35) {
                    hCol1.style.width = (col1Width + changeInPixels) + "px";
                    hCol2.style.width = (col2Width - changeInPixels) + "px";
                    bCol1.style.width = (col1Width + changeInPixels) + "px";
                    bCol2.style.width = (col2Width - changeInPixels) + "px";
                }
                e.preventDefault();
            }

            function endResize(e) {
                document.body.style.cursor = "auto";

                dojoArray.forEach(bodyHandlers, function(handler) {
                    handler.remove();
                });

                // recalc column sizes in %. Save to colArr
                var tableWidth = self.tblOld.offsetWidth;

                dojoArray.forEach(self.colArr, function(item, index) {
                    var headCol = self.tblOld.querySelectorAll(".mx-datagrid-head-table colgroup col")[index];

                    if (headCol.style.width.substring(headCol.style.width.length - 1) != "%") {
                        var widthInPercent = Math.round((((headCol.style.width.replace("px", "") / tableWidth) * 100) + 0.00001) * 100) / 100;

                        item.width = widthInPercent + "%";
                    }
                }.bind(self));

                // refresh table
                self.refreshTable(self.colArr, self.tblOld);

                //console.log("finished at: " + e.pageX);
                e.preventDefault();
            }

        },

        showHideList: function(btn) {
            this.inputNodes.style.display = (this.inputNodes.style.display == "none") ? "" : "none";

            if (this.inputNodes.style.display == "") {
                var rect = btn.getBoundingClientRect();
                //console.log(rect);

                this.inputNodes.style.top = rect.bottom + "px";

                // right align
                this.inputNodes.style.left = (rect.left - (this.inputNodes.offsetWidth - btn.offsetWidth)) + "px";

                // center align
                //this.inputNodes.style.left = (rect.left - ((this.inputNodes.offsetWidth / 2) - (btn.offsetWidth / 2))) + "px";
                // left align
                //this.inputNodes.style.left = (rect.left - btn.offsetWidth) + "px";
            }
        },

        // save data in localStorage
        setLocalStorage: function(name, value) {
            localStorage.setItem(name, JSON.stringify(value));
        },

        // save data in localStorage
        getLocalStorage: function(name) {
            var value = localStorage.getItem(name);
            return value && JSON.parse(value);
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");

            // Clean up listeners
            dojoArray.forEach(this._handles, function(handle, index) {
                handle.remove();
            });
            this._handles = [];
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                if (e.preventDefault) {
                    e.preventDefault();
                }
            }
        }
    });
});

mxui.dom.addCss(require.toUrl("dnbTableWidget/widget/ui/dnbTableWidget.css"));
require(["dnbTableWidget/widget/dnbTableWidget"]);