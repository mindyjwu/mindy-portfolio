# 康禾長照 營運入口 — MVP 原型導覽 (v2.0)
# Kanghe Long-Term Care — Operations Portal MVP Walkthrough (v2.0)

> **原型 v2.0** — 2026年9月30日交付版本  
> 這是一個「討論用原型」，不是可上線的系統。目的是把三個必須由貴院決定的問題，變成看得見、點得到的畫面；同時展示完整的組織架構與角色設計。  
> This is a **discussion prototype**, not production software. It visualizes three decisions your team must make, and demonstrates the full organizational structure and role model.

**檔案 / File:** `ltc-portal.html` — 單一檔案，用瀏覽器直接開啟即可，不需安裝、不需連線資料庫。  
Single self-contained file; open it in any browser. No install, no database, no login.

### 進入方式 Startup
開啟檔案後會先進到「原型說明」模組（新增），整理了：
1. 本次原型涵蓋什麼 (Scope & Status) — 已建置 vs 計畫功能
2. 角色與權限藍圖 (Roles & Permissions) — v2.0 規劃的9個角色中，哪3個已實現；其餘何時到位

之後再逐個測試各模組。

---

## 1. 這次做了什麼 / What is built

| 模組 Module | 內容 Contents | 狀態 Status |
|---|---|---|
| **原型說明 Prototype Info** (NEW) | 範圍與進展：已建置 / 計畫功能、多公司結構、團隊資源  角色與權限：9 個規劃角色藍圖、3 個已實現角色詳述  Scope & Status: built vs. planned features, multi-company model, resources. Roles & Permissions: 9-role roadmap and the 3 implemented roles. | 已建置 Built |
| **公告欄 Announcements** | 公告列表與內文（全集團／單院分眾）、公司行事曆（月曆＋當日行程）、集團組織圖、內部通訊錄（可搜尋） Board with group- and facility-targeted posts, company calendar, group org chart, searchable internal directory | 已建置 Built |
| **人事系統 HR core** | 員工資料（47 人／7 院＋總部）、出勤管理（各據點概況、個人月出勤圖、遲到／未打卡／加班統計）、請假審核（可實際簽核） Employee records (47 people across 7 facilities + HQ), attendance (by facility and by person), leave approvals you can actually click through | 已建置 Built |
| **權限與範圍 Roles & scope** | 權限對照表（3 身分 × 11 項權限）＋ 待決議題頁 Permission matrix (3 roles × 11 capabilities) and the open-questions page | 已建置 Built |
| 文件管理／服務管理／財務與採購／報表匯出／系統設定 Document Control / Service Management / Finance & Procurement / Reports Export / Settings | 左側選單以停用狀態呈現，只為表達完整系統輪廓 Shown disabled in the left rail, to convey the shape of the full system | 未建置 Not built |

**三種身分 / Three roles** — 用左上角「身分」下拉選單切換，畫面會立刻改變：
Switch with the **Role** dropdown at top-left; the screen changes immediately.

| 身分 Role | 人物 Persona | 看得到什麼 What they see |
|---|---|---|
| 系統管理員 System Admin | 陳志明・資訊管理專員・總部 | 跨 7 院全部資料、可管理權限，但**薪資欄位隱藏** All 7 facilities, manages permissions, **pay fields hidden** |
| 人資部經理 HR Manager | 林佩瑜・人力資源部・總部 | 跨 7 院全部資料 **含薪資**、可人資複核假單 All 7 facilities **including pay**, countersigns leave |
| 院長 Facility Director | 王淑芬・台中西屯院 | **預設僅限本院** 8 位同仁；無薪資、無手機號碼；可簽核部屬請假 **Own facility only by default** (8 staff); no pay, no mobile numbers; approves their own team's leave |

---

## 2. 什麼是模擬的 / What is mocked

- **沒有登入驗證** — 身分用下拉選單切換。No authentication; the role selector stands in for login.
- **沒有資料庫** — 所有資料存在瀏覽器記憶體，重新整理即還原。簽核、搜尋、篩選都是真的會動的，但不會被保存。No database; everything lives in browser memory. Approvals, search and filters really work, but nothing persists past a reload.
- **人員與院區全部虛構** — 47 位同仁、7 個院區（台北中山、新北板橋、桃園中壢、台中西屯、彰化員林、台南永康、高雄左營）與總部皆為虛構，不含任何真實個資。All 47 staff and all 7 facilities are fictional; no real personal data.
- **出勤資料為程式產生** — 未串接打卡機、班表或差勤系統。Attendance is generated demo data; no time-clock or roster integration.
- **公告無附件、無已讀回條；行事曆唯讀。** Announcements have no attachments or read receipts; the calendar is read-only.
- **展示日期固定為 2026-09-08。** The demo clock is fixed at 2026-09-08.

---

## 3. 需要貴院決定的三件事 / Three decisions we need from you

### Q1（主要議題）院長應該看到全集團 7 院的資料，還是僅限自己院區？
### Q1 (the main one) Should facility directors see data for all 7 facilities, or only their own?

- **原型預設：僅限本院。** 院長王淑芬只看得到台中西屯院的 8 位同仁、他們的出勤與請假；公告只看得到全集團公告與本院公告。
  **Prototype default: own facility only.** Director Wang sees only Xitun's 8 staff, their attendance and their leave; announcements are group-wide plus her own facility.
- **怎麼比較：** 畫面上方有一個橘色虛線的「假設 / ASSUMPTION — 主管可跨院查看」開關。打開它，同一個院長身分立刻看得到全部 47 人與 7 院出勤比較；關掉它就回到單院。**建議在會議中當場切換一次給大家看。**
  **How to compare:** the amber dashed **Assumption** switch at the top. Flip it on and the same director immediately sees all 47 people and all 7 facilities; flip it off to go back. **Worth toggling live in the meeting.**
- **取捨：** 開放後人力調度與跨院支援容易得多；但薪資以外的個資（分機、到職日、出勤異常）會全院互通，且每新增一個據點就擴大一次暴露面。
  **Trade-off:** cross-facility staffing and cover get much easier, but personal data beyond pay becomes mutually visible, and every new facility widens that exposure.
- **若答案是「部分開放」**，需要進一步定義：開放哪些欄位？哪些情境（例如支援排班期間限時開放）？
  **If the answer is "partly",** we must define which fields, and in which situations (e.g. time-limited access during a staffing cover period).

### Q2 系統管理員應不應該看到薪資資料？
### Q2 Should the system administrator be able to see pay data?

- **原型預設：不應該。** 管理員可跨院看人事與出勤、可管理權限，但薪資與職等欄位顯示為「僅人資可見」。
  **Prototype default: no.** The admin reads HR and attendance across facilities and manages permissions, but pay and pay band show as "HR only".
- **要注意：** 實務上系統管理員通常擁有資料庫層級存取權，畫面隱藏是流程控制，不是技術阻擋。若需要技術層級隔離或稽核紀錄（誰在何時看了薪資），必須在架構階段就決定。
  **Note:** an administrator normally holds database-level access, so hiding a field in the UI is a process control, not a technical barrier. Technical separation or an audit trail of pay-data access is an architecture-stage decision.

### Q3 院長核准請假後，是否仍需人資複核才生效？
### Q3 After a director approves leave, must HR countersign before it takes effect?

- **原型預設：需要。** 流程是「待主管簽核 → 待人資複核 → 生效」。在「人事系統 → 請假審核」可實際操作：用院長身分按「核准」，再切到人資身分按「人資複核」。
  **Prototype default: yes.** The flow is Awaiting director → Awaiting HR countersign → Effective. Try it in **HR → Leave approvals**: approve as the director, then switch to HR and countersign.
- **取捨：** 取消複核流程更快，但特休餘額與勞基法時數控管就必須由系統自動把關。是否要依假別分流（病假／事假由院長決行，特休才需人資複核）？
  **Trade-off:** dropping the countersign is faster, but the system must then enforce leave balances and Labor Standards Act limits automatically. Should this differ by leave type — sick and personal decided by the director, HR countersigning only annual leave?

---

## v2.0 新增：多公司結構與完整角色藍圖 / v2.0: Multi-Company Model & 9-Role Framework

v2.0 原型加入組織全景：

| 組織層級 | 實例 |
|-------|------|
| **3 家公司** | 誠馨北區公司（台北、新北、桃園）、誠馨中部公司（台中、彰化）、誠馨南部公司（台南、高雄） |
| **7 家院區** | 台北中山、新北板橋、桃園中壢、台中西屯、彰化員林、台南永康、高雄左營 |
| **9 個角色** (計畫) | ✓ 3 個已實現 (系管、人資、院長) + → 6 個計畫中 (營運長、財務、護理主管、照護主管、社工、公司經理) |

#### 已實現 3 角色 vs. 計畫中 6 角色

本原型實現的 3 個角色可完整互動；其餘 6 個角色（營運長、財務部經理等）在「角色與權限」頁面有完整說明但未建置功能，計畫於：
- **Phase 2 (11–12月)**: 薪資、詳細報表、營運長、公司經理、多公司帳務分離
- **Phase 3 (2027 Q1)**: 仁仁系統整合、個案管理、社工評估

#### 開發資源  
- **團隊**: 使用者 + AI 工具
- **時程**: 9月6–30日（原型 v1 + v2）
- **交付**: 互動原型 + 文檔 + 技術規劃
- **下一階段**: 若核准，完整開發投入 2026年Q4–2027年Q1

---

## 4. 建議的走查順序 / Suggested walkthrough order (約 15 分鐘 / ~15 min)

0. **(首先 First) 原型說明 → 範圍與進展 Prototype Info → Scope & Status**
   - 了解本次交付內容、計畫功能、多公司結構與團隊資源。  
   - Understand what's built, what's planned, the 3-company model, and development resources.

1. **原型說明 → 角色與權限 Prototype Info → Roles & Permissions**
   - 完整 9 角色藍圖：3 個已實現 + 6 個計畫中（分別在 Phase 2 與 Phase 3）。  
   - Full 9-role roadmap: 3 implemented + 6 planned (Phase 2–3 timeline).

2. **人資身分 As HR** → 公告欄：看分眾公告（全集團 vs 單院）與行事曆。Announcements: group vs facility targeting, and the calendar.

3. **人資身分 As HR** → 人事系統 → 員工資料：**薪資欄位可見**。Employee records — **pay is visible**.

4. **切到管理員 Switch to System Admin** → 同一頁：薪資變成「僅人資可見」。→ **Q2**。Same page: pay becomes "HR only" → **Q2**.

5. **切到院長 Switch to Facility Director** → 人數從 47 掉到 8，出勤只剩一院，通訊錄少了其他院同仁。Headcount drops 47 → 8; attendance covers one facility; the directory hides other facilities.

6. **打開上方「假設」開關 Flip the Assumption switch** → 同一個院長立刻看得到 7 院。→ **Q1，本次最重要的決定**。The same director now sees all 7 → **Q1, the decision that matters most**.

7. **請假審核 Leave approvals** → 用院長核准 → 切人資複核。→ **Q3**。Approve as director, countersign as HR → **Q3**.

8. **權限與範圍 → 權限對照表 Roles & scope → Permission matrix**：一頁看完 3 身分 × 11 項權限，會議中可直接在這張表上改。One page, 3 roles × 11 capabilities — amend it live in the meeting.

---

## 5. 下一步 / What comes next

本原型刻意不處理的部分，若要進入下一階段須先確認：
Deliberately out of scope here; needed before the next stage:

- 帳號與登入方式（AD／Google Workspace／自建） Accounts and sign-in (AD / Google Workspace / in-house)
- 個資保護與稽核紀錄要求 Personal-data protection and audit-log requirements
- 與現有打卡、班表、薪資系統的介接 Integration with existing time-clock, rostering and payroll systems
- 其餘 5 個模組的優先順序 Priority order for the remaining 5 modules
