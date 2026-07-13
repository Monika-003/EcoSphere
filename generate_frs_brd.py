
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas as pdfcanvas

OUTPUT_PATH = r"C:\Users\lenovo\OneDrive\Desktop\practice\EcoSphere\EcoSphere_FRS_BRD_Document.pdf"

# ── Colours ──────────────────────────────────────────────────────────────────
DARK_GREEN   = colors.HexColor("#1B5E20")
MID_GREEN    = colors.HexColor("#388E3C")
LIGHT_GREEN  = colors.HexColor("#E8F5E9")
ACCENT_GREEN = colors.HexColor("#A5D6A7")
WHITE        = colors.white
BLACK        = colors.black
GREY_LIGHT   = colors.HexColor("#F5F5F5")
GREY_MED     = colors.HexColor("#BDBDBD")
AMBER        = colors.HexColor("#FF8F00")
RED_SOFT     = colors.HexColor("#C62828")
BLUE_SOFT    = colors.HexColor("#1565C0")

# ── Page canvas callback (header + footer) ───────────────────────────────────
class HeaderFooterCanvas(pdfcanvas.Canvas):
    def __init__(self, *args, **kwargs):
        pdfcanvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            pdfcanvas.Canvas.showPage(self)
        pdfcanvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        page = self._pageNumber
        w, h = A4
        if page == 1:
            return  # cover page – no header/footer

        # Header bar
        self.setFillColor(DARK_GREEN)
        self.rect(0, h - 18*mm, w, 18*mm, fill=1, stroke=0)
        self.setFillColor(WHITE)
        self.setFont("Helvetica-Bold", 8)
        self.drawString(15*mm, h - 11*mm, "EcoSphere Enterprise Sustainability & ESG Platform")
        self.setFont("Helvetica", 8)
        self.drawRightString(w - 15*mm, h - 11*mm, "FRS / BRD  v1.0  |  CONFIDENTIAL")

        # Footer bar
        self.setFillColor(LIGHT_GREEN)
        self.rect(0, 0, w, 12*mm, fill=1, stroke=0)
        self.setFillColor(DARK_GREEN)
        self.setFont("Helvetica", 7.5)
        self.drawString(15*mm, 4*mm, "Copyright © 2026 EcoSphere. All Rights Reserved.")
        self.setFont("Helvetica-Bold", 8)
        self.drawCentredString(w/2, 4*mm, f"Page {page} of {page_count}")
        self.drawRightString(w - 15*mm, 4*mm, "Prepared by: EcoSphere Platform Team")


# ── Style factory ─────────────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()

    cover_title = ParagraphStyle("CoverTitle",
        fontSize=28, leading=36, alignment=TA_CENTER,
        textColor=WHITE, fontName="Helvetica-Bold", spaceAfter=10)

    cover_sub = ParagraphStyle("CoverSub",
        fontSize=14, leading=20, alignment=TA_CENTER,
        textColor=ACCENT_GREEN, fontName="Helvetica", spaceAfter=6)

    cover_meta = ParagraphStyle("CoverMeta",
        fontSize=11, leading=16, alignment=TA_CENTER,
        textColor=WHITE, fontName="Helvetica")

    sec_title = ParagraphStyle("SecTitle",
        fontSize=16, leading=22, textColor=WHITE,
        fontName="Helvetica-Bold", spaceAfter=4, spaceBefore=14,
        backColor=DARK_GREEN, leftIndent=-8, rightIndent=-8,
        borderPadding=(5, 8, 5, 8))

    subsec = ParagraphStyle("SubSec",
        fontSize=12, leading=16, textColor=DARK_GREEN,
        fontName="Helvetica-Bold", spaceAfter=4, spaceBefore=10,
        borderPadding=(0, 0, 2, 0))

    body = ParagraphStyle("Body",
        fontSize=9, leading=13, textColor=BLACK,
        fontName="Helvetica", spaceAfter=4, alignment=TA_JUSTIFY)

    bullet = ParagraphStyle("Bullet",
        fontSize=9, leading=13, textColor=BLACK,
        fontName="Helvetica", spaceAfter=3,
        leftIndent=12, bulletIndent=0)

    toc_item = ParagraphStyle("TocItem",
        fontSize=10, leading=16, textColor=DARK_GREEN,
        fontName="Helvetica", leftIndent=6)

    toc_sub = ParagraphStyle("TocSub",
        fontSize=9, leading=14, textColor=MID_GREEN,
        fontName="Helvetica", leftIndent=20)

    label = ParagraphStyle("Label",
        fontSize=8, leading=11, textColor=BLACK,
        fontName="Helvetica-Bold")

    workflow_step = ParagraphStyle("WFStep",
        fontSize=9, leading=13, textColor=BLACK,
        fontName="Helvetica", leftIndent=20, spaceAfter=3)

    return dict(cover_title=cover_title, cover_sub=cover_sub, cover_meta=cover_meta,
                sec_title=sec_title, subsec=subsec, body=body, bullet=bullet,
                toc_item=toc_item, toc_sub=toc_sub, label=label,
                workflow_step=workflow_step)


# ── Table helpers ─────────────────────────────────────────────────────────────
def cell(text, bold=False, size=8, color=BLACK, align=TA_LEFT, bg=None):
    style = ParagraphStyle("cell", fontSize=size, leading=size+3,
                           textColor=color, fontName="Helvetica-Bold" if bold else "Helvetica",
                           alignment=align, wordWrap='CJK')
    return Paragraph(str(text), style)


def hdr(*cols):
    return [cell(c, bold=True, color=WHITE, bg=DARK_GREEN) for c in cols]


def std_style(col_count, row_count, stripe=True):
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_GREEN),
        ('TEXTCOLOR',  (0, 0), (-1, 0), WHITE),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, -1), 8),
        ('LEADING',    (0, 0), (-1, -1), 11),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GREEN] if stripe else [WHITE]),
        ('GRID',       (0, 0), (-1, -1), 0.4, GREY_MED),
        ('VALIGN',     (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING',   (0, 0), (-1, -1), 4),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
    ]
    return TableStyle(cmds)


def make_table(data, col_widths, stripe=True):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(std_style(len(col_widths), len(data), stripe))
    return t


# ── Section title block ───────────────────────────────────────────────────────
def section_header(s, number, title):
    story = [Spacer(1, 6*mm)]
    bar_style = ParagraphStyle("bar", fontSize=13, leading=18, textColor=WHITE,
                               fontName="Helvetica-Bold", backColor=DARK_GREEN,
                               borderPadding=(6, 10, 6, 10), spaceAfter=6)
    story.append(Paragraph(f"Section {number}  |  {title}", bar_style))
    return story


def subsec_hdr(s, text):
    return [Paragraph(text, s['subsec']), HRFlowable(width="100%", thickness=1,
            color=ACCENT_GREEN, spaceAfter=4)]


# ═════════════════════════════════════════════════════════════════════════════
# BUILD DOCUMENT
# ═════════════════════════════════════════════════════════════════════════════
def build():
    W, H = A4
    doc = SimpleDocTemplate(
        OUTPUT_PATH, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=24*mm, bottomMargin=18*mm,
        title="EcoSphere FRS/BRD v1.0",
        author="EcoSphere Platform Team",
        subject="Functional Requirements Specification & Business Requirements Document"
    )

    s = make_styles()
    story = []

    # ── COVER PAGE ────────────────────────────────────────────────────────────
    # Full-page dark green background via a big table trick
    cover_data = [[""]]
    cover_t = Table(cover_data, colWidths=[W - 36*mm], rowHeights=[H - 36*mm])
    cover_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), DARK_GREEN),
        ('LEFTPADDING',   (0,0), (-1,-1), 0),
        ('RIGHTPADDING',  (0,0), (-1,-1), 0),
        ('TOPPADDING',    (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(cover_t)

    # Overlay content on cover – use a nested table for layout
    cover_inner = [
        [Spacer(1, 40*mm)],
        [Paragraph("EcoSphere", s['cover_title'])],
        [Paragraph("Enterprise Sustainability &amp; ESG Platform", s['cover_title'])],
        [Spacer(1, 6*mm)],
        [Paragraph("Functional Requirements Specification", s['cover_sub'])],
        [Paragraph("&amp; Business Requirements Document", s['cover_sub'])],
        [Spacer(1, 10*mm)],
        [HRFlowable(width="80%", thickness=1.5, color=ACCENT_GREEN, spaceAfter=8)],
        [Spacer(1, 6*mm)],
        [Paragraph("Version: v1.0  |  Date: June 2026", s['cover_meta'])],
        [Paragraph("Prepared by: EcoSphere Platform Team", s['cover_meta'])],
        [Spacer(1, 6*mm)],
        [Paragraph("CONFIDENTIAL — FOR INTERNAL USE ONLY", ParagraphStyle("conf",
            fontSize=10, textColor=AMBER, fontName="Helvetica-Bold", alignment=TA_CENTER))],
        [Spacer(1, 20*mm)],
        [Paragraph("Frameworks Covered: GRI 2021  |  BRSR  |  TCFD  |  ISO 14001  |  ISAE 3000  |  MoEFCC EIA 2006",
            ParagraphStyle("fw", fontSize=9, textColor=ACCENT_GREEN,
                           fontName="Helvetica", alignment=TA_CENTER))],
    ]
    ci_t = Table(cover_inner, colWidths=[W - 36*mm])
    ci_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), DARK_GREEN),
        ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ('LEFTPADDING',   (0,0), (-1,-1), 20),
        ('RIGHTPADDING',  (0,0), (-1,-1), 20),
        ('TOPPADDING',    (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))

    # Replace the blank cover with the actual content (we can't overlay easily with Platypus)
    # So we pop the blank table and use the content table instead
    story.pop()  # remove blank cover_t
    story.append(ci_t)
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ─────────────────────────────────────────────────────
    toc_title_style = ParagraphStyle("TocTitle", fontSize=18, leading=24,
                                     textColor=DARK_GREEN, fontName="Helvetica-Bold",
                                     spaceAfter=10, alignment=TA_CENTER)
    story.append(Paragraph("Table of Contents", toc_title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=DARK_GREEN, spaceAfter=8))
    story.append(Spacer(1, 4*mm))

    toc_entries = [
        ("1", "Executive Summary", ""),
        ("2", "Business Objectives", ""),
        ("3", "Platform Scope & Modules", ""),
        ("4", "Organization Structure", ""),
        ("5", "User Roles & Approval Hierarchy", ""),
        ("6", "Sustainability Governance Module", [
            "6.1 Governance Requirements",
            "6.2 Governance Workflows",
        ]),
        ("7", "Data Collection Framework", [
            "7.1 Universal Evidence Capture",
            "7.2 Supported File Types",
        ]),
        ("8", "Environmental Data Collection", [
            "8.1 Energy (GRI 302)",
            "8.2 Water (GRI 303)",
            "8.3 Waste (GRI 306)",
            "8.4 GHG Emissions (GRI 305)",
        ]),
        ("9", "Social Data Collection", [
            "9.1 Workforce & Diversity (GRI 401/405)",
            "9.2 Occupational Health & Safety (GRI 403)",
            "9.3 Training & Development (GRI 404)",
        ]),
        ("10", "Governance & Compliance", [
            "10.1 Policy Library",
            "10.2 Legal Compliance Register",
            "10.3 Whistleblower Management",
        ]),
        ("11", "Stakeholder Engagement", [
            "11.1 Stakeholder Groups",
            "11.2 Materiality Assessment Process",
            "11.3 18 Material Topics",
        ]),
        ("12", "Supplier Sustainability", [
            "12.1 Supplier Registration",
            "12.2 Supplier ESG Scoring",
        ]),
        ("13", "Targets & Goals Tracking", ""),
        ("14", "ESG Risk Management", [
            "14.1 Risk Register",
            "14.2 TCFD Risk Categories",
        ]),
        ("15", "Reporting Framework", [
            "15.1 Report Types",
            "15.2 Report Content Structure",
        ]),
        ("16", "Evidence Management Framework", ""),
        ("17", "Screen Requirements", [
            "17.1 Dashboard",
            "17.2 Data Entry Forms",
            "17.3 Evidence Repository",
            "17.4 Approval Workflow",
            "17.5 Report Generation",
        ]),
        ("18", "User Workflows", [
            "18.1 Monthly Environmental Data Submission",
            "18.2 Annual ESG Report Generation",
            "18.3 Supplier ESG Onboarding",
        ]),
        ("19", "Non-Functional Requirements", ""),
        ("20", "Document Control", ""),
    ]

    for num, title, subs in toc_entries:
        story.append(Paragraph(f"<b>{num}.</b>  {title}", s['toc_item']))
        if subs:
            for sub in subs:
                story.append(Paragraph(f"&#x2022; {sub}", s['toc_sub']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1 — EXECUTIVE SUMMARY
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 1, "Executive Summary")
    story.append(Paragraph(
        "The <b>EcoSphere Enterprise Sustainability &amp; ESG Platform</b> is a comprehensive digital solution "
        "designed to manage the complete sustainability lifecycle — from data collection at facility level to "
        "board-level disclosures. The platform is modelled on globally recognized sustainability reporting "
        "frameworks including <b>GRI Standards 2021</b>, <b>BRSR</b> (Business Responsibility and Sustainability "
        "Reporting), <b>TCFD</b> (Task Force on Climate-related Financial Disclosures), and "
        "<b>MoEFCC EIA Notification 2006</b>.", s['body']))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("The platform enables organizations to:", s['subsec']))
    for item in [
        "Collect sustainability data from all facilities, plants, and business units",
        "Manage evidence uploads with complete audit trails and version control",
        "Track progress against sustainability targets with RAG status indicators",
        "Generate publication-ready ESG, Sustainability, EIA, and Carbon reports",
        "Ensure regulatory compliance across environmental, social, and governance dimensions",
        "Enable board-level oversight and stakeholder transparency",
    ]:
        story.append(Paragraph(f"&#x2022;  {item}", s['bullet']))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Four Sustainability Pillars", s['subsec']))
    pillars = [
        hdr("Pillar", "Name", "Focus Areas"),
        [cell("Pillar I",   bold=True, color=DARK_GREEN), cell("Ethical Governance Practices"),
         cell("Anti-corruption, board oversight, data privacy, regulatory compliance")],
        [cell("Pillar II",  bold=True, color=DARK_GREEN), cell("Preserving Our Planet"),
         cell("Energy, GHG emissions, water, waste, biodiversity, air quality")],
        [cell("Pillar III", bold=True, color=DARK_GREEN), cell("Our People, Our Strength"),
         cell("Employee wellbeing, diversity, OHS, training, human rights")],
        [cell("Pillar IV",  bold=True, color=DARK_GREEN), cell("Steering Towards Progress"),
         cell("Community development, supply chain, economic performance")],
    ]
    story.append(make_table(pillars, [25*mm, 55*mm, 90*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2 — BUSINESS OBJECTIVES
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 2, "Business Objectives")
    bo_data = [
        hdr("Ref", "Objective", "Description", "Priority", "Framework"),
        [cell("BO-01",bold=True), cell("Centralized ESG Data Management"),
         cell("Single platform for all sustainability data across all facilities"),
         cell("Critical",bold=True,color=RED_SOFT), cell("GRI 2021")],
        [cell("BO-02",bold=True), cell("Regulatory Compliance"),
         cell("Adherence to BRSR, GRI, TCFD, EIA, and local regulations"),
         cell("Critical",bold=True,color=RED_SOFT), cell("BRSR/GRI")],
        [cell("BO-03",bold=True), cell("Target Tracking"),
         cell("Monitor progress against Net Zero 2045 and all sustainability targets"),
         cell("High",bold=True,color=AMBER), cell("TCFD")],
        [cell("BO-04",bold=True), cell("Stakeholder Reporting"),
         cell("Generate publication-ready reports for investors, regulators, customers"),
         cell("High",bold=True,color=AMBER), cell("GRI 302-306")],
        [cell("BO-05",bold=True), cell("Supply Chain Sustainability"),
         cell("Extend ESG requirements to suppliers and value chain partners"),
         cell("High",bold=True,color=AMBER), cell("GRI 308/414")],
        [cell("BO-06",bold=True), cell("Risk Management"),
         cell("Identify, assess, and mitigate climate and ESG risks"),
         cell("High",bold=True,color=AMBER), cell("TCFD")],
        [cell("BO-07",bold=True), cell("Evidence Management"),
         cell("Digital repository for all sustainability evidence with version control"),
         cell("Medium"), cell("ISO 14001")],
        [cell("BO-08",bold=True), cell("Governance Oversight"),
         cell("Enable board and committee oversight of ESG performance"),
         cell("Critical",bold=True,color=RED_SOFT), cell("GRI 2-9")],
        [cell("BO-09",bold=True), cell("Materiality Assessment"),
         cell("Conduct and document double materiality assessments"),
         cell("High",bold=True,color=AMBER), cell("GRI 3")],
        [cell("BO-10",bold=True), cell("Audit Readiness"),
         cell("Maintain audit-ready data with complete chain of custody"),
         cell("Critical",bold=True,color=RED_SOFT), cell("ISAE 3000")],
    ]
    story.append(make_table(bo_data, [14*mm, 42*mm, 65*mm, 18*mm, 22*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3 — PLATFORM SCOPE & MODULES
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 3, "Platform Scope & Modules")
    mod_data = [
        hdr("Module #", "Module Name", "Pillar", "Key Functions", "Frameworks"),
        [cell("M-01",bold=True), cell("Sustainability Dashboard"),    cell("All"),       cell("KPI cards, target progress, alerts, charts"),          cell("All")],
        [cell("M-02",bold=True), cell("Governance & Organization"),   cell("Pillar I"),  cell("Org profile, committee, charter, meetings"),           cell("GRI 2-9")],
        [cell("M-03",bold=True), cell("Materiality Assessment"),      cell("All"),       cell("18 topics, double materiality, stakeholder input"),    cell("GRI 3")],
        [cell("M-04",bold=True), cell("Stakeholder Engagement"),      cell("All"),       cell("Surveys, meetings, feedback, engagement log"),         cell("GRI 2-29")],
        [cell("M-05",bold=True), cell("Energy Management"),           cell("Pillar II"), cell("Electricity, diesel, coal, CNG, renewables"),          cell("GRI 302")],
        [cell("M-06",bold=True), cell("Water Management"),            cell("Pillar II"), cell("Freshwater, recycled, groundwater, effluent"),         cell("GRI 303")],
        [cell("M-07",bold=True), cell("Waste Management"),            cell("Pillar II"), cell("Hazardous, non-hazardous, recycled, landfill"),        cell("GRI 306")],
        [cell("M-08",bold=True), cell("GHG & Emissions"),             cell("Pillar II"), cell("Scope 1, 2, 3 emissions tracking"),                   cell("GRI 305/TCFD")],
        [cell("M-09",bold=True), cell("Workforce & Diversity"),       cell("Pillar III"),cell("Headcount, gender, hires, attrition, PwD"),            cell("GRI 401/405")],
        [cell("M-10",bold=True), cell("Occupational Health & Safety"),cell("Pillar III"),cell("LTI, near miss, fatalities, audits"),                  cell("GRI 403")],
        [cell("M-11",bold=True), cell("Training & Development"),      cell("Pillar III"),cell("Training hours, programs, coverage"),                  cell("GRI 404")],
        [cell("M-12",bold=True), cell("Compliance & Governance"),     cell("Pillar I"),  cell("Policies, legal register, whistleblower"),             cell("GRI 205/206")],
        [cell("M-13",bold=True), cell("Supply Chain Sustainability"), cell("Pillar IV"), cell("Supplier registration, ESG scores, CoC"),              cell("GRI 308/414")],
        [cell("M-14",bold=True), cell("ESG Risk Management"),         cell("All"),       cell("Risk register, heat map, TCFD risk categories"),       cell("TCFD")],
        [cell("M-15",bold=True), cell("Reporting & Disclosures"),     cell("All"),       cell("ESG, EIA, Carbon, BRSR report generation"),            cell("All Frameworks")],
    ]
    story.append(make_table(mod_data, [16*mm, 44*mm, 22*mm, 55*mm, 30*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 4 — ORGANIZATION STRUCTURE
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 4, "Organization Structure")
    story.append(Paragraph(
        "The platform supports a multi-level organizational hierarchy enabling data collection, "
        "review, and approval at each level:", s['body']))

    org_data = [
        hdr("Level", "Entity Type", "Examples", "Sustainability Role"),
        [cell("Level 1"), cell("Corporate Organization"),   cell("Group / Holding Company"),
         cell("Strategic oversight, board governance, report publication")],
        [cell("Level 2"), cell("Business Divisions"),       cell("Pharmaceuticals, Chemicals, APIs"),
         cell("Division-level ESG targets, performance tracking")],
        [cell("Level 3"), cell("Manufacturing Units/Plants"),cell("Plant A, Plant B, API Unit"),
         cell("Primary data collection, facility-level approvals")],
        [cell("Level 4"), cell("R&D Centers"),              cell("Research Campus, Innovation Lab"),
         cell("R&D-specific environmental & social data")],
        [cell("Level 5"), cell("Departments"),              cell("HR, HSE, Finance, Procurement"),
         cell("Module-specific data entry and evidence upload")],
        [cell("Level 6"), cell("Employees & Contractors"),  cell("Individual contributors"),
         cell("Training records, incident reporting, survey responses")],
    ]
    story.append(make_table(org_data, [18*mm, 42*mm, 45*mm, 62*mm]))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("Additional Entities Supported:", s['subsec']))
    for ent in [
        "Sustainability Committee — cross-functional body driving ESG agenda",
        "Board of Directors — ultimate ESG accountability and report sign-off",
        "External Suppliers — self-service supplier portal for ESG data submission",
        "External Stakeholders — investors, regulators, NGOs, local communities",
    ]:
        story.append(Paragraph(f"&#x2022;  {ent}", s['bullet']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 5 — USER ROLES & APPROVAL HIERARCHY
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 5, "User Roles & Approval Hierarchy")
    story += subsec_hdr(s, "5.1  User Roles & Permissions")

    roles_data = [
        hdr("Role ID", "Role Name", "Level", "Permissions", "Approval Authority"),
        [cell("R-01",bold=True), cell("Super Administrator"),         cell("System"),         cell("Full access, configuration, user management"),                     cell("All modules")],
        [cell("R-02",bold=True), cell("Board Member"),                cell("L1"),             cell("Read-all, approve ESG reports, review governance"),                cell("Final approval")],
        [cell("R-03",bold=True), cell("Chief Sustainability Officer"),cell("L1"),             cell("All modules, report publication, target setting"),                 cell("L1 approver")],
        [cell("R-04",bold=True), cell("Sustainability Manager"),      cell("L2"),             cell("Data review, module management, report drafts"),                   cell("L2 approver")],
        [cell("R-05",bold=True), cell("Sustainability Coordinator"),  cell("L3"),             cell("Data entry, evidence upload, module updates"),                     cell("L3 reviewer")],
        [cell("R-06",bold=True), cell("Plant / Facility Head"),       cell("L3"),             cell("Facility data approval, local oversight"),                         cell("Facility approver")],
        [cell("R-07",bold=True), cell("HSE Officer"),                 cell("L4"),             cell("EHS data entry, incident logging, safety data"),                   cell("Data submitter")],
        [cell("R-08",bold=True), cell("HR Manager"),                  cell("L4"),             cell("Workforce data, training records, diversity data"),                cell("Data submitter")],
        [cell("R-09",bold=True), cell("Finance Officer"),             cell("L4"),             cell("Energy invoices, utility bills, capex data"),                      cell("Data submitter")],
        [cell("R-10",bold=True), cell("Compliance Officer"),          cell("L4"),             cell("Policies, audits, legal register, whistleblower"),                 cell("Data submitter")],
        [cell("R-11",bold=True), cell("Procurement Manager"),         cell("L4"),             cell("Supplier data, CoC tracking, supply chain"),                       cell("Data submitter")],
        [cell("R-12",bold=True), cell("IT Administrator"),            cell("System"),         cell("System config, integrations, user access"),                        cell("Technical admin")],
        [cell("R-13",bold=True), cell("Supplier Representative"),     cell("External"),       cell("Supplier portal, own ESG data upload"),                            cell("Self-service")],
        [cell("R-14",bold=True), cell("External Auditor"),            cell("External"),       cell("Read-only verified data, evidence review"),                        cell("Verification only")],
        [cell("R-15",bold=True), cell("Sustainability Ambassador"),   cell("Cross-functional"),cell("Champion data, awareness, training facilitation"),                cell("Advocate")],
        [cell("R-16",bold=True), cell("Report Viewer"),               cell("Read-only"),      cell("View dashboards, download published reports"),                     cell("None")],
    ]
    story.append(make_table(roles_data, [14*mm, 44*mm, 26*mm, 60*mm, 28*mm]))
    story.append(Spacer(1, 5*mm))

    story += subsec_hdr(s, "5.2  Six-Level Approval Hierarchy")
    approval_data = [
        hdr("Step", "Actor", "Action", "Outcome"),
        [cell("Step 1", bold=True), cell("HSE / HR / Finance Officer"),
         cell("Submit data with evidence attachments"),
         cell("Record in 'Pending Review' status")],
        [cell("Step 2", bold=True), cell("Plant / Facility Head"),
         cell("Review and validate facility-level data accuracy"),
         cell("Approved → moves to Step 3; Rejected → back to submitter")],
        [cell("Step 3", bold=True), cell("Sustainability Coordinator"),
         cell("Verify evidence quality and completeness"),
         cell("Verified → moves to Step 4; Clarification requested if needed")],
        [cell("Step 4", bold=True), cell("Sustainability Manager"),
         cell("Cross-facility consolidation and data review"),
         cell("Approved → moves to Step 5; Escalated if discrepancies found")],
        [cell("Step 5", bold=True), cell("Chief Sustainability Officer"),
         cell("Strategic alignment check and final approval"),
         cell("Final approval → Data locked for reporting")],
        [cell("Step 6", bold=True), cell("Board of Directors"),
         cell("Annual ESG report acknowledgment and sign-off"),
         cell("Report published; board resolution recorded")],
    ]
    story.append(make_table(approval_data, [16*mm, 46*mm, 65*mm, 45*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 6 — SUSTAINABILITY GOVERNANCE MODULE
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 6, "Sustainability Governance Module")
    story += subsec_hdr(s, "6.1  Functional Requirements")

    gov_data = [
        hdr("Req ID", "Requirement", "Description", "Evidence Required", "Approver"),
        [cell("GOV-01",bold=True), cell("Organization Profile"),
         cell("Capture company name, CIN, industry, HQ, sites, reporting year, CEO details"),
         cell("Certificate of Incorporation"), cell("CSO")],
        [cell("GOV-02",bold=True), cell("Sustainability Charter"),
         cell("Upload and manage sustainability charter with version control and sign-off"),
         cell("Charter PDF (signed)"), cell("Board")],
        [cell("GOV-03",bold=True), cell("Committee Management"),
         cell("Register all committee members: name, designation, role, division, tenure"),
         cell("Appointment letters"), cell("CSO")],
        [cell("GOV-04",bold=True), cell("Meeting Log"),
         cell("Record meetings: date, type, attendees, agenda, minutes, action items"),
         cell("Meeting minutes PDF"), cell("Sustainability Mgr")],
        [cell("GOV-05",bold=True), cell("Governance Structure"),
         cell("Visual hierarchy: Board → Steering Committee → Ambassadors → Champions"),
         cell("Org chart PDF"), cell("CSO")],
        [cell("GOV-06",bold=True), cell("ESG Oversight"),
         cell("Track board ESG review frequency, topics discussed, and decisions taken"),
         cell("Board resolution"), cell("Board")],
        [cell("GOV-07",bold=True), cell("Sustainability Ambassadors"),
         cell("Register ambassadors per facility with contact details and focus area"),
         cell("Nomination form"), cell("Facility Head")],
        [cell("GOV-08",bold=True), cell("Sustainability Champions"),
         cell("Register champions per department with training status and activities"),
         cell("Champion certificate"), cell("Sustainability Mgr")],
        [cell("GOV-09",bold=True), cell("Annual Planning"),
         cell("Create and track annual sustainability plan with milestones and owners"),
         cell("Plan document PDF"), cell("CSO")],
        [cell("GOV-10",bold=True), cell("Review Calendar"),
         cell("Schedule sustainability review and board meetings with reminders"),
         cell("Calendar invites"), cell("CSO")],
    ]
    story.append(make_table(gov_data, [16*mm, 38*mm, 63*mm, 35*mm, 22*mm]))
    story.append(Spacer(1, 4*mm))

    story += subsec_hdr(s, "6.2  Governance Workflow")
    for step in [
        "Annual Planning: CSO creates sustainability plan → approved by Board",
        "Committee Setup: Members registered → roles assigned → charter uploaded",
        "Quarterly Reviews: Meetings scheduled → minutes recorded → actions tracked",
        "Ambassador Network: Ambassadors nominated per facility → training completed",
        "Champion Program: Champions registered per department → activities logged",
        "Board ESG Review: Quarterly ESG summary presented → board decisions recorded",
        "Annual Report Initiation: CSO triggers report generation at year end",
    ]:
        story.append(Paragraph(f"&#x2022;  {step}", s['bullet']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 7 — DATA COLLECTION FRAMEWORK
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 7, "Data Collection Framework")
    story.append(Paragraph(
        "Every data submission across all modules must capture the following universal metadata fields. "
        "This ensures complete traceability, audit readiness, and evidence linkage for every reported metric.",
        s['body']))
    story.append(Spacer(1, 3*mm))

    story += subsec_hdr(s, "7.1  Universal Evidence Capture Fields")
    dcf_data = [
        hdr("Field", "Type", "Required", "Description"),
        [cell("Facility Name"),     cell("Dropdown"),    cell("Yes"), cell("Site / plant / unit name from master list")],
        [cell("Department"),        cell("Dropdown"),    cell("Yes"), cell("Submitting department from org hierarchy")],
        [cell("Reporting Period"),  cell("Date range"),  cell("Yes"), cell("Month / Quarter / Year selection")],
        [cell("Data Owner"),        cell("User lookup"), cell("Yes"), cell("Responsible person for this data entry")],
        [cell("Evidence Files"),    cell("File upload"), cell("Yes"), cell("Bills, reports, certificates — see 7.2")],
        [cell("Upload Date"),       cell("Auto-filled"), cell("Yes"), cell("System timestamp at upload")],
        [cell("Approval Status"),   cell("Status"),      cell("Auto"),cell("Pending / Under Review / Approved / Rejected")],
        [cell("Verification Status"),cell("Status"),     cell("Auto"),cell("Unverified / Verified / Certified (ISAE 3000)")],
        [cell("Reviewer Comments"), cell("Text area"),   cell("No"),  cell("Notes, queries, or instructions from reviewer")],
        [cell("Version Number"),    cell("Auto-integer"),"Auto",     cell("Increments on each re-submission")],
        [cell("Audit Trail"),       cell("System log"),  cell("Auto"),cell("All actions timestamped with user, action, result")],
    ]
    story.append(make_table(dcf_data, [40*mm, 28*mm, 20*mm, 80*mm]))

    story.append(Spacer(1, 5*mm))
    story += subsec_hdr(s, "7.2  Supported Evidence File Types")
    ftype_data = [
        hdr("File Category", "Accepted Formats", "Max Size", "Use Case"),
        [cell("Images"),               cell("JPG, PNG, HEIC, WEBP"),  cell("10 MB"), cell("Site photos, equipment, events, awareness programs")],
        [cell("Documents"),            cell("PDF, DOCX, DOC"),         cell("25 MB"), cell("Reports, policies, certificates, meeting minutes")],
        [cell("Spreadsheets"),         cell("XLSX, CSV, XLS"),         cell("20 MB"), cell("Meter readings, monitoring data, HR extracts")],
        [cell("Utility Bills"),        cell("PDF, JPG, PNG"),           cell("15 MB"), cell("Electricity, water, gas, fuel invoices")],
        [cell("Compliance Certs"),     cell("PDF"),                    cell("10 MB"), cell("ISO 14001, ISO 45001, BIS, OHSAS certificates")],
        [cell("Audit Reports"),        cell("PDF, DOCX"),              cell("25 MB"), cell("Internal / external audit findings and responses")],
        [cell("Training Records"),     cell("PDF, XLSX, JPG"),         cell("20 MB"), cell("Attendance sheets, completion certificates, photos")],
    ]
    story.append(make_table(ftype_data, [38*mm, 38*mm, 20*mm, 72*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 8 — ENVIRONMENTAL DATA COLLECTION
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 8, "Environmental Data Collection")

    # 8.1 Energy
    story += subsec_hdr(s, "8.1  Energy Management  (GRI 302)")
    energy_data = [
        hdr("Parameter", "Unit", "Source", "Evidence Required", "Frequency", "GRI Code"),
        [cell("Grid Electricity"),         cell("kWh"),   cell("Utility bills"),       cell("Electricity bills + meter readings"), cell("Monthly"), cell("GRI 302-1")],
        [cell("Diesel Consumption"),       cell("Litres"),cell("Fuel invoices"),        cell("Delivery invoices + DG log"),         cell("Monthly"), cell("GRI 302-1")],
        [cell("Coal Consumption"),         cell("MT"),    cell("Purchase invoices"),    cell("Weighbridge slips + invoices"),       cell("Monthly"), cell("GRI 302-1")],
        [cell("CNG Consumption"),          cell("SCM"),   cell("Gas bills"),            cell("Gas meter readings + bills"),         cell("Monthly"), cell("GRI 302-1")],
        [cell("Renewable Energy Generated"),cell("kWh"),  cell("Generation meter"),     cell("Solar/wind generation logs"),         cell("Monthly"), cell("GRI 302-1")],
        [cell("Renewable Energy Purchased"),cell("kWh"),  cell("REC certificates"),     cell("REC purchase documents"),             cell("Monthly"), cell("GRI 302-1")],
        [cell("Energy Intensity"),         cell("GJ/unit"),cell("Calculated"),          cell("Production records"),                 cell("Monthly"), cell("GRI 302-3")],
    ]
    story.append(make_table(energy_data, [44*mm, 16*mm, 28*mm, 47*mm, 20*mm, 18*mm]))

    # 8.2 Water
    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "8.2  Water Management  (GRI 303)")
    water_data = [
        hdr("Parameter", "Unit", "Source", "Evidence Required", "Frequency", "GRI Code"),
        [cell("Municipal Water"),     cell("KL"),   cell("Water bills"),      cell("Utility bills"),              cell("Monthly"), cell("GRI 303-3")],
        [cell("Groundwater"),         cell("KL"),   cell("Borewell meter"),   cell("Meter log / extraction permit"),cell("Monthly"), cell("GRI 303-3")],
        [cell("Recycled Water"),      cell("KL"),   cell("ETP / STP"),        cell("ETP operational records"),    cell("Monthly"), cell("GRI 303-3")],
        [cell("Rainwater Harvested"), cell("KL"),   cell("Collection meter"), cell("Rainwater harvesting log"),   cell("Monthly"), cell("GRI 303-3")],
        [cell("Effluent Discharged"), cell("KL"),   cell("Flow meter"),       cell("ETP discharge logs / NOC"),   cell("Monthly"), cell("GRI 303-4")],
        [cell("pH of Effluent"),      cell("pH"),   cell("Lab test"),         cell("NABL lab test report"),       cell("Monthly"), cell("GRI 303-4")],
        [cell("BOD"),                 cell("mg/L"), cell("Lab test"),         cell("NABL lab test report"),       cell("Monthly"), cell("GRI 303-4")],
        [cell("COD"),                 cell("mg/L"), cell("Lab test"),         cell("NABL lab test report"),       cell("Monthly"), cell("GRI 303-4")],
        [cell("Water Intensity"),     cell("KL/unit"),cell("Calculated"),     cell("Production records"),         cell("Monthly"), cell("GRI 303-5")],
    ]
    story.append(make_table(water_data, [40*mm, 16*mm, 28*mm, 47*mm, 20*mm, 18*mm]))

    story.append(PageBreak())

    # 8.3 Waste
    story += subsec_hdr(s, "8.3  Waste Management  (GRI 306)")
    waste_data = [
        hdr("Parameter", "Unit", "Source", "Evidence Required", "Frequency", "GRI Code"),
        [cell("Hazardous Waste Generated"),  cell("MT"),  cell("Manifest"),         cell("TSDF manifest / Form 3 / Form 10"), cell("Monthly"),    cell("GRI 306-3")],
        [cell("Non-Hazardous Waste"),        cell("MT"),  cell("Weighbridge"),      cell("Weighbridge slips"),                cell("Monthly"),    cell("GRI 306-4")],
        [cell("Recycled Waste"),             cell("MT"),  cell("Vendor receipt"),   cell("Recycler authorization certificate"),cell("Monthly"),   cell("GRI 306-5")],
        [cell("Waste to Landfill"),          cell("MT"),  cell("Disposal cert"),    cell("Landfill operator receipt"),        cell("Monthly"),    cell("GRI 306-5")],
        [cell("Biomedical Waste"),           cell("KG"),  cell("Incinerator log"),  cell("CBWTF receipt"),                    cell("Monthly"),    cell("GRI 306-3")],
        [cell("E-Waste"),                    cell("KG"),  cell("Manifest"),         cell("PRO / E-waste authorization"),      cell("Quarterly"),  cell("GRI 306-3")],
    ]
    story.append(make_table(waste_data, [44*mm, 14*mm, 28*mm, 51*mm, 20*mm, 18*mm]))

    # 8.4 GHG
    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "8.4  GHG Emissions  (GRI 305 / TCFD)")
    ghg_data = [
        hdr("Parameter", "Unit", "Scope", "Source", "Evidence Required", "Frequency", "GRI Code"),
        [cell("Diesel (Stationary)"), cell("tCO<sub>2</sub>e"), cell("Scope 1"), cell("Fuel invoices"),    cell("Delivery invoices"), cell("Monthly"),   cell("GRI 305-1")],
        [cell("CNG Combustion"),      cell("tCO<sub>2</sub>e"), cell("Scope 1"), cell("Gas bills"),        cell("Gas meter + bills"), cell("Monthly"),   cell("GRI 305-1")],
        [cell("Coal Combustion"),     cell("tCO<sub>2</sub>e"), cell("Scope 1"), cell("Coal invoices"),    cell("Coal invoices"),     cell("Monthly"),   cell("GRI 305-1")],
        [cell("Grid Electricity"),    cell("tCO<sub>2</sub>e"), cell("Scope 2"), cell("Electricity bills"),cell("Electricity bills"), cell("Monthly"),   cell("GRI 305-2")],
        [cell("Business Travel"),     cell("tCO<sub>2</sub>e"), cell("Scope 3"), cell("Travel records"),   cell("Flight/hotel bills"),cell("Quarterly"), cell("GRI 305-3")],
        [cell("Supply Chain"),        cell("tCO<sub>2</sub>e"), cell("Scope 3"), cell("Supplier data"),    cell("Supplier reports"),  cell("Annual"),    cell("GRI 305-3")],
        [cell("GHG Intensity"),       cell("tCO<sub>2</sub>e/unit"),cell("—"),   cell("Calculated"),       cell("Production records"),cell("Monthly"),   cell("GRI 305-4")],
    ]
    story.append(make_table(ghg_data, [32*mm, 20*mm, 18*mm, 28*mm, 32*mm, 18*mm, 18*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 9 — SOCIAL DATA COLLECTION
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 9, "Social Data Collection")

    story += subsec_hdr(s, "9.1  Workforce & Diversity  (GRI 401 / 405)")
    wf_data = [
        hdr("Parameter", "Unit", "Source", "Evidence Required", "Frequency"),
        [cell("Total Employees"),           cell("Count"),          cell("HRMS"),               cell("HRMS extract / payroll report"),    cell("Monthly")],
        [cell("Male Employees"),            cell("Count"),          cell("HRMS"),               cell("HRMS extract"),                    cell("Monthly")],
        [cell("Female Employees"),          cell("Count"),          cell("HRMS"),               cell("HRMS extract"),                    cell("Monthly")],
        [cell("Contract Workers"),          cell("Count"),          cell("Contractor records"), cell("Contractor register"),             cell("Monthly")],
        [cell("Workers with Disabilities"), cell("Count"),          cell("HR records"),         cell("PwD declaration forms"),           cell("Monthly")],
        [cell("New Hires"),                 cell("Count"),          cell("HRMS"),               cell("Offer letters / joining report"),  cell("Monthly")],
        [cell("Attrition"),                 cell("Count"),          cell("HRMS"),               cell("Exit records / separation list"),  cell("Monthly")],
        [cell("Women in Leadership"),       cell("%"),              cell("HRMS"),               cell("Org chart extract"),               cell("Quarterly")],
        [cell("Avg Training Hours"),        cell("Hrs/employee"),   cell("LMS"),                cell("LMS training records"),            cell("Monthly")],
    ]
    story.append(make_table(wf_data, [46*mm, 22*mm, 32*mm, 50*mm, 22*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "9.2  Occupational Health & Safety  (GRI 403)")
    ohs_data = [
        hdr("Parameter", "Unit", "Source", "Evidence Required", "Frequency"),
        [cell("Lost Time Injuries (LTI)"),  cell("Count"), cell("Incident register"),   cell("Incident investigation reports"),  cell("Monthly")],
        [cell("Lost Working Days (LWD)"),   cell("Days"),  cell("Incident register"),   cell("Medical certificates"),            cell("Monthly")],
        [cell("Near Miss Incidents"),       cell("Count"), cell("Near miss register"),  cell("Near miss reports"),               cell("Monthly")],
        [cell("First Aid Cases (FAC)"),     cell("Count"), cell("First aid register"),  cell("First aid treatment records"),     cell("Monthly")],
        [cell("Fatalities"),               cell("Count"), cell("Incident register"),   cell("Investigation report, FIR copy"),  cell("Immediate")],
        [cell("Man-hours Worked"),          cell("Hours"), cell("Attendance system"),   cell("Attendance records, timesheet"),   cell("Monthly")],
        [cell("Safety Audits Conducted"),   cell("Count"), cell("Audit schedule"),      cell("Audit reports with findings"),     cell("Monthly")],
        [cell("Safety Observations"),       cell("Count"), cell("Observation cards"),   cell("Observation logs"),                cell("Monthly")],
        [cell("LTIFR (calculated)"),        cell("Rate"),  cell("System calculated"),   cell("—"),                               cell("Monthly")],
        [cell("TRIFR (calculated)"),        cell("Rate"),  cell("System calculated"),   cell("—"),                               cell("Monthly")],
    ]
    story.append(make_table(ohs_data, [46*mm, 18*mm, 36*mm, 48*mm, 24*mm]))
    story.append(PageBreak())

    story += subsec_hdr(s, "9.3  Training & Development  (GRI 404)")
    td_data = [
        hdr("Training Category", "Evidence Required", "Tracking Fields"),
        [cell("Safety Training"),             cell("Attendance sheets, certificate scans"),        cell("Hours, participants, coverage %, pass rate")],
        [cell("Environmental Training"),       cell("Attendance + assessment scores"),              cell("Hours, participants, topics covered")],
        [cell("Ethics & Anti-Corruption"),     cell("Completion certificates, sign-off sheets"),    cell("Coverage %, completion date, re-training due")],
        [cell("Human Rights"),                 cell("Sign-off sheets, declarations"),               cell("Coverage %, employees covered, contractors")],
        [cell("Leadership Development"),       cell("Program completion records"),                  cell("Participants, program name, duration")],
        [cell("Technical Skills"),             cell("Certification copies, assessment results"),    cell("Certifications earned, skills updated")],
        [cell("Sustainability Awareness"),     cell("Attendance sheets + event photos"),            cell("Reach, engagement, quiz scores")],
    ]
    story.append(make_table(td_data, [46*mm, 62*mm, 62*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 10 — GOVERNANCE & COMPLIANCE
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 10, "Governance & Compliance")

    story += subsec_hdr(s, "10.1  Policy Library  (11 Required Policies)")
    policy_data = [
        hdr("Policy #", "Policy Name", "Review Frequency", "Evidence Required", "GRI Reference"),
        [cell("P-01",bold=True), cell("Sustainability Policy"),             cell("Annual"),   cell("Board-signed PDF"),         cell("GRI 2-23")],
        [cell("P-02",bold=True), cell("Environmental Policy"),              cell("Annual"),   cell("Signed PDF"),               cell("GRI 302-306")],
        [cell("P-03",bold=True), cell("Human Rights Policy"),               cell("Annual"),   cell("Signed PDF"),               cell("GRI 406-412")],
        [cell("P-04",bold=True), cell("Anti-Bribery & Corruption Policy"),  cell("Annual"),   cell("Signed PDF"),               cell("GRI 205")],
        [cell("P-05",bold=True), cell("Diversity & Inclusion Policy"),      cell("Annual"),   cell("Signed PDF"),               cell("GRI 405")],
        [cell("P-06",bold=True), cell("Occupational Health & Safety Policy"),cell("Annual"),  cell("Signed PDF"),               cell("GRI 403")],
        [cell("P-07",bold=True), cell("Supplier Code of Conduct"),          cell("Annual"),   cell("Signed CoC document"),      cell("GRI 308/414")],
        [cell("P-08",bold=True), cell("Whistleblower Protection Policy"),   cell("Annual"),   cell("Signed PDF"),               cell("GRI 2-26")],
        [cell("P-09",bold=True), cell("Data Privacy Policy"),               cell("Annual"),   cell("Signed PDF"),               cell("GRI 418")],
        [cell("P-10",bold=True), cell("Community Engagement Policy"),       cell("Biennial"), cell("Signed PDF"),               cell("GRI 413")],
        [cell("P-11",bold=True), cell("Climate Change Policy"),             cell("Annual"),   cell("Board-signed PDF"),         cell("GRI 201/305")],
    ]
    story.append(make_table(policy_data, [16*mm, 52*mm, 26*mm, 40*mm, 28*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "10.2  Legal Compliance Register")
    legal_data = [
        hdr("Field", "Description", "Options / Format"),
        [cell("Act / Regulation"),     cell("Name of applicable law or standard"),        cell("Free text with search")],
        [cell("Jurisdiction"),         cell("Scope of the regulation"),                   cell("National / State / Local / International")],
        [cell("Compliance Status"),    cell("Current compliance position"),                cell("Compliant / Non-Compliant / Partial / N/A")],
        [cell("Due Date"),             cell("Next compliance deadline or renewal"),        cell("Date picker")],
        [cell("Responsible Owner"),    cell("User assigned for compliance action"),        cell("User lookup dropdown")],
        [cell("Evidence"),             cell("Supporting document for compliance"),         cell("NOC / Certificate / Consent order")],
        [cell("Last Audit Date"),      cell("Date of last compliance check"),              cell("Date picker")],
        [cell("Next Review Date"),     cell("Scheduled next review"),                      cell("Auto-calculated (+ 6 or 12 months)")],
    ]
    story.append(make_table(legal_data, [40*mm, 70*mm, 60*mm]))
    story.append(PageBreak())

    story += subsec_hdr(s, "10.3  Whistleblower Case Management Workflow")
    wb_steps = [
        "Case Registered — Ref number auto-generated; date, category, and description captured",
        "Investigator Assigned — Compliance Officer or designated investigator notified",
        "Investigation Initiated — Evidence collected; interviews conducted if required",
        "Status Updated — Progress tracked: Open → Under Investigation → Resolved",
        "Resolution Documented — Resolution summary, corrective actions, and evidence uploaded",
        "Case Closed — Closure date recorded; complainant notified (if not anonymous)",
        "Annual Summary — All cases summarized for board ESG review",
    ]
    for i, step in enumerate(wb_steps, 1):
        story.append(Paragraph(f"Step {i}:  {step}", s['workflow_step']))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 11 — STAKEHOLDER ENGAGEMENT
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 11, "Stakeholder Engagement")

    story += subsec_hdr(s, "11.1  Stakeholder Groups & Engagement Methods")
    stake_data = [
        hdr("Group #", "Stakeholder Group", "Primary Concerns", "Engagement Methods"),
        [cell("SG-01"), cell("Investors & Shareholders"),  cell("ESG ratings, financial risks, disclosures"),    cell("Annual reports, AGM, ESG briefings")],
        [cell("SG-02"), cell("Employees & Unions"),        cell("Safety, wellbeing, fair wages, growth"),        cell("Surveys, town halls, grievance mechanism")],
        [cell("SG-03"), cell("Customers"),                 cell("Product safety, sustainability credentials"),   cell("Audits, sustainability certificates, meetings")],
        [cell("SG-04"), cell("Suppliers & Vendors"),       cell("CoC compliance, payment terms, ESG audit"),     cell("Supplier portal, workshops, audits")],
        [cell("SG-05"), cell("Regulators & Government"),   cell("Compliance, reporting accuracy, permits"),      cell("Regulatory filings, inspections, meetings")],
        [cell("SG-06"), cell("Local Communities"),         cell("Pollution, employment, CSR programs"),          cell("Community meetings, CSR events, surveys")],
        [cell("SG-07"), cell("NGOs & Civil Society"),      cell("Environmental impact, human rights"),           cell("Partnerships, consultations, reports")],
        [cell("SG-08"), cell("Media"),                     cell("Transparency, positive ESG story"),             cell("Press releases, ESG report launch events")],
        [cell("SG-09"), cell("Industry Associations"),     cell("Sector standards, benchmarking"),               cell("Industry forums, working groups")],
        [cell("SG-10"), cell("Academic Institutions"),     cell("Research collaboration, internships"),          cell("MoUs, internship programs, joint research")],
    ]
    story.append(make_table(stake_data, [16*mm, 40*mm, 55*mm, 57*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "11.2  Materiality Assessment Process  (Double Materiality)")
    mat_steps = [
        "Identify Material Topics — Pre-loaded 18 topics from GRI Universal Standards",
        "Stakeholder Surveys — Collect impact materiality scores (1–5 scale) from all stakeholder groups",
        "Financial Materiality Scoring — Internal team scores financial impact potential (1–5 scale)",
        "Double Materiality Matrix — Plot all topics on impact vs. financial materiality axes",
        "Prioritize Top Topics — Identify high-priority topics based on combined score threshold",
        "Map to GRI Disclosures — Each material topic linked to applicable GRI topic standards",
        "Board Approval — Final materiality matrix reviewed and approved by Board / Sustainability Committee",
    ]
    for i, step in enumerate(mat_steps, 1):
        story.append(Paragraph(f"Step {i}:  {step}", s['workflow_step']))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "11.3  18 Material Topics")
    mat_data = [
        hdr("Topic #", "Material Topic", "Pillar", "GRI Code", "Impact Type"),
        [cell("T-01"), cell("Ethical Business Practices"),    cell("Pillar I"),   cell("GRI 205"),      cell("Impact + Financial")],
        [cell("T-02"), cell("Regulatory Compliance"),         cell("Pillar I"),   cell("GRI 207"),      cell("Financial")],
        [cell("T-03"), cell("ESG Governance"),                cell("Pillar I"),   cell("GRI 2-9"),      cell("Impact + Financial")],
        [cell("T-04"), cell("Data Privacy & Security"),       cell("Pillar I"),   cell("GRI 418"),      cell("Financial")],
        [cell("T-05"), cell("Energy Management"),             cell("Pillar II"),  cell("GRI 302"),      cell("Impact + Financial")],
        [cell("T-06"), cell("GHG Emissions & Climate"),       cell("Pillar II"),  cell("GRI 305"),      cell("Impact + Financial")],
        [cell("T-07"), cell("Water Stewardship"),             cell("Pillar II"),  cell("GRI 303"),      cell("Impact + Financial")],
        [cell("T-08"), cell("Waste & Circular Economy"),      cell("Pillar II"),  cell("GRI 306"),      cell("Impact")],
        [cell("T-09"), cell("Biodiversity"),                  cell("Pillar II"),  cell("GRI 304"),      cell("Impact")],
        [cell("T-10"), cell("Air Quality"),                   cell("Pillar II"),  cell("GRI 305"),      cell("Impact + Financial")],
        [cell("T-11"), cell("Employee Wellbeing"),            cell("Pillar III"), cell("GRI 401"),      cell("Impact + Financial")],
        [cell("T-12"), cell("Diversity & Inclusion"),         cell("Pillar III"), cell("GRI 405"),      cell("Impact + Financial")],
        [cell("T-13"), cell("Occupational Health & Safety"),  cell("Pillar III"), cell("GRI 403"),      cell("Impact + Financial")],
        [cell("T-14"), cell("Training & Development"),        cell("Pillar III"), cell("GRI 404"),      cell("Impact + Financial")],
        [cell("T-15"), cell("Human Rights"),                  cell("Pillar III"), cell("GRI 406-412"),  cell("Impact")],
        [cell("T-16"), cell("Community Development"),         cell("Pillar IV"),  cell("GRI 413"),      cell("Impact")],
        [cell("T-17"), cell("Supply Chain Sustainability"),   cell("Pillar IV"),  cell("GRI 308/414"),  cell("Impact + Financial")],
        [cell("T-18"), cell("Economic Performance"),          cell("Pillar IV"),  cell("GRI 201"),      cell("Financial")],
    ]
    story.append(make_table(mat_data, [16*mm, 54*mm, 24*mm, 28*mm, 42*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 12 — SUPPLIER SUSTAINABILITY
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 12, "Supplier Sustainability")

    story += subsec_hdr(s, "12.1  Supplier Registration & ESG Data Requirements")
    supp_data = [
        hdr("Field", "Description", "Evidence Required", "Required"),
        [cell("Code of Conduct Signed"),   cell("Digital acceptance of Supplier CoC"),           cell("Signed CoC document"),          cell("Mandatory")],
        [cell("ISO 14001 Certification"),  cell("Environmental management certification"),        cell("Valid certificate copy"),       cell("Mandatory")],
        [cell("ISO 45001 Certification"),  cell("OHS management certification"),                  cell("Valid certificate copy"),       cell("Preferred")],
        [cell("Carbon Footprint"),         cell("Annual Scope 1 + Scope 2 emissions"),            cell("Emissions report / data sheet"), cell("Mandatory")],
        [cell("Water Consumption"),        cell("Annual total water consumption"),                cell("Utility bills summary"),        cell("Mandatory")],
        [cell("Waste Generated"),          cell("Annual hazardous + non-hazardous waste"),        cell("Disposal manifests"),           cell("Mandatory")],
        [cell("Employee Count"),           cell("Total workforce including contractors"),          cell("HR summary report"),            cell("Mandatory")],
        [cell("Safety Record"),            cell("LTI count, fatalities, LTIFR"),                  cell("Incident log"),                 cell("Mandatory")],
        [cell("ESG Audit Date"),           cell("Date of last sustainability audit"),             cell("Audit report"),                 cell("Preferred")],
        [cell("Risk Level"),               cell("High / Medium / Low classification"),            cell("Risk self-assessment form"),    cell("Mandatory")],
    ]
    story.append(make_table(supp_data, [46*mm, 52*mm, 44*mm, 26*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "12.2  Supplier ESG Scoring Matrix  (0–100 Scale)")
    score_data = [
        hdr("Scoring Category", "Weight", "Max Score", "Criteria"),
        [cell("Environmental Performance", bold=True), cell("30%"), cell("30"), cell("Emissions, water use, waste recycling rate, ISO 14001")],
        [cell("Social Performance",        bold=True), cell("25%"), cell("25"), cell("Safety record, employee diversity, training, human rights")],
        [cell("Governance & Compliance",   bold=True), cell("25%"), cell("25"), cell("Anti-corruption policy, compliance status, audit findings")],
        [cell("CoC Acceptance",            bold=True), cell("10%"), cell("10"), cell("Signed and dated Supplier Code of Conduct")],
        [cell("Certification Status",      bold=True), cell("10%"), cell("10"), cell("ISO 14001, ISO 45001, BIS, and other applicable certs")],
        [cell("TOTAL",                     bold=True), cell("100%"),cell("100"),cell("Score bands: 80-100 = Green, 50-79 = Amber, <50 = Red (High Risk)")],
    ]
    story.append(make_table(score_data, [50*mm, 18*mm, 22*mm, 80*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 13 — TARGETS & GOALS
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 13, "Targets & Goals Tracking")

    tgt_data = [
        hdr("Target ID", "Target Description", "Baseline", "Target Value", "Target Year", "Status", "Owner"),
        [cell("TGT-01",bold=True), cell("Achieve Net Zero GHG Emissions"),       cell("2019 baseline"), cell("Net Zero"),  cell("2045"), cell("On Track",  color=MID_GREEN,  bold=True), cell("CSO")],
        [cell("TGT-02",bold=True), cell("Reduce Scope 1 & 2 by 25%"),           cell("2019 baseline"), cell("-25%"),      cell("2030"), cell("On Track",  color=MID_GREEN,  bold=True), cell("Energy Mgr")],
        [cell("TGT-03",bold=True), cell("25% Renewable Energy Share"),           cell("5% (2019)"),     cell("25%"),       cell("2030"), cell("On Track",  color=MID_GREEN,  bold=True), cell("Facilities")],
        [cell("TGT-04",bold=True), cell("Reduce Freshwater Consumption 33%"),    cell("2019 baseline"), cell("-33%"),      cell("2030"), cell("At Risk",   color=AMBER,      bold=True), cell("Water Mgr")],
        [cell("TGT-05",bold=True), cell("Zero Waste to Landfill"),               cell("Current MT"),    cell("0 MT"),      cell("2026"), cell("On Track",  color=MID_GREEN,  bold=True), cell("HSE Officer")],
        [cell("TGT-06",bold=True), cell("30% Women in Workforce"),               cell("Current %"),     cell("30%"),       cell("2030"), cell("On Track",  color=MID_GREEN,  bold=True), cell("HR Manager")],
        [cell("TGT-07",bold=True), cell("100% Supplier CoC Acceptance"),         cell("Current %"),     cell("100%"),      cell("2026"), cell("On Track",  color=MID_GREEN,  bold=True), cell("Procurement")],
        [cell("TGT-08",bold=True), cell("100% Human Rights Training Coverage"),  cell("Current %"),     cell("100%"),      cell("2025"), cell("Completed", color=BLUE_SOFT,  bold=True), cell("HR Manager")],
        [cell("TGT-09",bold=True), cell("Zero Fatalities"),                      cell("0 target"),      cell("0",),        cell("Annual"),cell("On Track", color=MID_GREEN,  bold=True), cell("HSE Officer")],
        [cell("TGT-10",bold=True), cell("20% Increase in Training Hours"),       cell("Baseline hrs"),  cell("+20%"),      cell("2025"), cell("On Track",  color=MID_GREEN,  bold=True), cell("L&D Head")],
        [cell("TGT-11",bold=True), cell("100% Facilities ISO 14001 Certified"),  cell("Count"),         cell("100%"),      cell("2026"), cell("On Track",  color=MID_GREEN,  bold=True), cell("EHS Head")],
        [cell("TGT-12",bold=True), cell("50% Recycled Water Usage"),             cell("Current %"),     cell("50%"),       cell("2030"), cell("At Risk",   color=AMBER,      bold=True), cell("Water Mgr")],
    ]
    story.append(make_table(tgt_data, [16*mm, 52*mm, 20*mm, 18*mm, 18*mm, 18*mm, 22*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 14 — ESG RISK MANAGEMENT
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 14, "ESG Risk Management")

    story += subsec_hdr(s, "14.1  Risk Register Fields")
    risk_fields = [
        hdr("Field", "Type", "Description"),
        [cell("Risk ID"),          cell("Auto-generated"), cell("Unique identifier: RSK-001, RSK-002 etc.")],
        [cell("Risk Description"), cell("Free text"),       cell("Clear description of the risk event")],
        [cell("Category"),         cell("Dropdown"),        cell("Physical / Transition / Compliance / Supply Chain / Safety")],
        [cell("Likelihood (1-5)"), cell("Integer"),         cell("1 = Rare, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Almost Certain")],
        [cell("Impact (1-5)"),     cell("Integer"),         cell("1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Catastrophic")],
        [cell("Risk Score"),       cell("Calculated"),      cell("Likelihood × Impact = Score (1–25); Heat map color coded")],
        [cell("Mitigation Plan"),  cell("Text"),            cell("Actions to reduce likelihood or impact")],
        [cell("Owner"),            cell("User lookup"),     cell("Assigned risk owner responsible for mitigation")],
        [cell("Review Date"),      cell("Date"),            cell("Next scheduled risk review date")],
        [cell("Status"),           cell("Dropdown"),        cell("Open / Under Mitigation / Residual Risk / Closed")],
        [cell("Evidence"),         cell("File upload"),     cell("Supporting documents for risk assessment")],
    ]
    story.append(make_table(risk_fields, [38*mm, 28*mm, 104*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "14.2  TCFD Risk Categories & Pre-loaded Risks")
    tcfd_data = [
        hdr("Risk ID", "Risk Description", "Category", "Likelihood", "Impact", "Score", "Mitigation Owner"),
        [cell("HR-01",bold=True), cell("Carbon pricing / carbon tax introduction"),   cell("Transition"), cell("4"), cell("5"), cell("20",bold=True,color=RED_SOFT),  cell("CSO")],
        [cell("HR-02",bold=True), cell("Water scarcity affecting operations"),        cell("Physical"),   cell("4"), cell("4"), cell("16",bold=True,color=RED_SOFT),  cell("Water Mgr")],
        [cell("HR-03",bold=True), cell("Regulatory non-compliance (EIA/BRSR/GRI)"),  cell("Compliance"), cell("3"), cell("5"), cell("15",bold=True,color=AMBER),     cell("Compliance Officer")],
        [cell("HR-04",bold=True), cell("Supply chain ESG failures"),                 cell("Supply Chain"),cell("3"),cell("4"), cell("12",bold=True,color=AMBER),     cell("Procurement")],
        [cell("HR-05",bold=True), cell("Extreme weather disruption to facilities"),  cell("Physical"),   cell("3"), cell("4"), cell("12",bold=True,color=AMBER),     cell("Facility Head")],
        [cell("HR-06",bold=True), cell("Shift to stricter emission regulations"),    cell("Transition"), cell("4"), cell("3"), cell("12",bold=True,color=AMBER),     cell("Energy Mgr")],
    ]
    story.append(make_table(tcfd_data, [16*mm, 55*mm, 24*mm, 18*mm, 16*mm, 16*mm, 30*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 15 — REPORTING FRAMEWORK
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 15, "Reporting Framework")

    story += subsec_hdr(s, "15.1  Report Types Supported")
    report_data = [
        hdr("Report #", "Report Name", "Framework", "Frequency", "Approver"),
        [cell("R-01",bold=True), cell("Annual Sustainability Report"),  cell("GRI 2021"),       cell("Annual"),         cell("Board")],
        [cell("R-02",bold=True), cell("BRSR Report"),                   cell("SEBI BRSR"),      cell("Annual"),         cell("CFO / CSO")],
        [cell("R-03",bold=True), cell("Environmental Impact Assessment"),cell("MoEFCC EIA 2006"),cell("Project-based"), cell("Board / Regulator")],
        [cell("R-04",bold=True), cell("Carbon Emissions Report"),       cell("GRI 305 / TCFD"), cell("Annual"),         cell("CSO")],
        [cell("R-05",bold=True), cell("Water Stewardship Report"),      cell("GRI 303"),        cell("Annual"),         cell("CSO")],
        [cell("R-06",bold=True), cell("Waste Management Report"),       cell("GRI 306"),        cell("Annual"),         cell("CSO")],
        [cell("R-07",bold=True), cell("Safety Performance Report"),     cell("GRI 403"),        cell("Annual"),         cell("HSE Head")],
        [cell("R-08",bold=True), cell("Supplier ESG Report"),           cell("GRI 308/414"),    cell("Annual"),         cell("Procurement")],
        [cell("R-09",bold=True), cell("Board ESG Summary"),             cell("Internal"),       cell("Quarterly"),      cell("Board")],
        [cell("R-10",bold=True), cell("Facility-wise ESG Report"),      cell("Internal"),       cell("Monthly"),        cell("Facility Head")],
        [cell("R-11",bold=True), cell("Third-party Assurance Report"),  cell("ISAE 3000"),      cell("Annual"),         cell("External Auditor")],
    ]
    story.append(make_table(report_data, [16*mm, 54*mm, 34*mm, 26*mm, 36*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "15.2  Annual Sustainability Report — Content Structure")
    content_data = [
        hdr("Section #", "Section Title", "Data Source Module", "Frameworks Mapped"),
        [cell("1"), cell("Cover Page (company, year, pillar icons)"),    cell("Governance Module"),        cell("GRI 2-1")],
        [cell("2"), cell("About the Report (boundary, scope, restatements)"),cell("Governance Module"),   cell("GRI 2-2, 2-3")],
        [cell("3"), cell("Message from Leadership (CEO, Chairman)"),     cell("Governance Module"),        cell("GRI 2-22")],
        [cell("4"), cell("About the Organization"),                      cell("Governance Module"),        cell("GRI 2-1 to 2-6")],
        [cell("5"), cell("Sustainability Governance Structure"),         cell("Governance Module"),        cell("GRI 2-9 to 2-21")],
        [cell("6"), cell("Materiality Assessment & Topics"),             cell("Materiality Module"),       cell("GRI 3-1, 3-2, 3-3")],
        [cell("7"), cell("Stakeholder Engagement Summary"),              cell("Stakeholder Module"),       cell("GRI 2-29, 2-30")],
        [cell("8"), cell("Environmental Performance"),                   cell("Energy/Water/Waste/GHG"),   cell("GRI 302, 303, 305, 306")],
        [cell("9"), cell("Social Performance"),                          cell("Workforce/OHS/Training"),   cell("GRI 401, 403, 404, 405")],
        [cell("10"),cell("Governance Performance"),                      cell("Compliance Module"),        cell("GRI 205, 206, 418")],
        [cell("11"),cell("Supply Chain Sustainability"),                 cell("Supply Chain Module"),      cell("GRI 308, 414")],
        [cell("12"),cell("Targets & Commitments (RAG status)"),          cell("Targets Module"),           cell("TCFD, BRSR")],
        [cell("13"),cell("GRI Content Index"),                           cell("System auto-generated"),    cell("GRI 2-55")],
        [cell("14"),cell("Independent Assurance Statement"),             cell("Evidence Repository"),      cell("ISAE 3000")],
    ]
    story.append(make_table(content_data, [14*mm, 60*mm, 48*mm, 44*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 16 — EVIDENCE MANAGEMENT
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 16, "Evidence Management Framework")

    story += subsec_hdr(s, "16.1  Evidence Lifecycle Stages")
    ev_stages = [
        hdr("Stage", "Stage Name", "Action", "Actor", "Outcome"),
        [cell("1",bold=True), cell("Upload"),       cell("User uploads file with metadata (facility, period, type, description)"), cell("Data Submitter"), cell("File in Pending Review")],
        [cell("2",bold=True), cell("Tagging"),       cell("System auto-tags by module, period, facility; user adds manual tags"),   cell("System + User"),  cell("Fully tagged evidence record")],
        [cell("3",bold=True), cell("Review"),        cell("Reviewer opens evidence, comments, requests clarification if needed"),   cell("Facility Head"),  cell("Queries raised or passed to Step 4")],
        [cell("4",bold=True), cell("Verification"),  cell("Coordinator verifies evidence against reported data values"),           cell("Sust. Coordinator"),cell("Verified status applied")],
        [cell("5",bold=True), cell("Approval"),      cell("Sustainability Manager approves evidence for use in reports"),           cell("Sust. Manager"),  cell("Approved — locked for reports")],
        [cell("6",bold=True), cell("Archive"),        cell("Approved evidence archived with 7-year retention policy"),             cell("System"),         cell("Immutable archive record")],
        [cell("7",bold=True), cell("Audit Access"),  cell("External auditors get read-only access to approved evidence"),          cell("External Auditor"),cell("Audit trail accessible")],
    ]
    story.append(make_table(ev_stages, [12*mm, 24*mm, 68*mm, 34*mm, 32*mm]))

    story.append(Spacer(1, 4*mm))
    story += subsec_hdr(s, "16.2  Evidence Metadata Schema")
    meta_data = [
        hdr("Field", "Type", "Auto / Manual", "Description"),
        [cell("Evidence ID"),       cell("String"),   cell("Auto"), cell("System-generated unique identifier")],
        [cell("File Name"),         cell("String"),   cell("Auto"), cell("Original file name at upload")],
        [cell("File Type"),         cell("String"),   cell("Auto"), cell("PDF, XLSX, JPG, PNG, DOCX etc.")],
        [cell("File Size"),         cell("Integer"),  cell("Auto"), cell("File size in KB")],
        [cell("Upload Date"),       cell("DateTime"), cell("Auto"), cell("Timestamp of upload")],
        [cell("Uploaded By"),       cell("User ref"), cell("Auto"), cell("User ID and name")],
        [cell("Facility"),          cell("Dropdown"), cell("Manual"),cell("Site/plant where evidence originated")],
        [cell("Department"),        cell("Dropdown"), cell("Manual"),cell("Submitting department")],
        [cell("Module"),            cell("Dropdown"), cell("Manual"),cell("Energy, Water, Safety, Training etc.")],
        [cell("Reporting Period"),  cell("Date range"),cell("Manual"),cell("Month/Quarter/Year coverage")],
        [cell("Description"),       cell("Text"),     cell("Manual"),cell("Brief description of evidence content")],
        [cell("Tags"),              cell("Multi-tag"),cell("Manual"),cell("Searchable keyword tags")],
        [cell("Approval Status"),   cell("Enum"),     cell("Auto"), cell("Pending / Under Review / Approved / Rejected")],
        [cell("Approved By"),       cell("User ref"), cell("Auto"), cell("Approver's user ID and name")],
        [cell("Approval Date"),     cell("DateTime"), cell("Auto"), cell("Timestamp of approval action")],
        [cell("Linked Data Records"),cell("List"),    cell("Auto"), cell("Linked data entries in any module")],
    ]
    story.append(make_table(meta_data, [40*mm, 24*mm, 24*mm, 82*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 17 — SCREEN REQUIREMENTS
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 17, "Screen Requirements")

    scr_list = [
        ("SCR-01", "Sustainability Dashboard", [
            "Organization KPI summary: 6 cards — Total GHG Emissions, Total Energy, Total Water, Total Waste, LTI Count, Women %",
            "Target progress bars: 12 targets with RAG color coding (Green ≥ target, Amber 70–99%, Red < 70%)",
            "Module completion status: data collection progress per module per period",
            "Alerts panel: overdue approvals, missing data submissions, upcoming deadlines",
            "Quick action buttons: Add Data, Upload Evidence, Generate Report",
            "Interactive charts: GHG trend (line chart), Energy mix (pie), Water balance (bar), Waste composition (donut)",
        ]),
        ("SCR-02", "Data Entry Forms (All Modules)", [
            "Header: module name, facility selector (dropdown), reporting period selector, data owner field",
            "Data grid: Parameter | Unit | Value field | Trend indicator | Previous period | % change",
            "Evidence upload zone: drag-and-drop interface, file type validation, max 25 MB per file",
            "Notes / comments free text field",
            "Save as Draft / Submit for Review action buttons",
            "Mandatory field validation with clear error messages before submission",
        ]),
        ("SCR-03", "Evidence Repository", [
            "Search and filter bar: by module, facility, period, approval status, file type",
            "Grid / list toggle view",
            "Evidence cards showing: thumbnail, file name, facility, period, status badge, upload date",
            "Bulk actions: Download selected, Approve selected, Reject selected",
            "Evidence detail panel: file preview, metadata, approval history, comments thread",
        ]),
        ("SCR-04", "Approval Workflow Screen", [
            "My Approvals queue: pending items sorted by due date with module and facility context",
            "Data summary: submitted values vs. previous period comparison with trend indicator",
            "Evidence preview panel: side-by-side with data values",
            "Action buttons: Approve / Reject / Request Clarification",
            "Comments field: mandatory on rejection",
            "Escalation button: send to next level with escalation reason",
            "Approval history timeline: all actions with timestamp and user name",
        ]),
        ("SCR-05", "Report Generation Screen", [
            "Report type selector: dropdown of all 11 report types",
            "Reporting period selector: Year / Quarter / Month",
            "Facility scope selector: All facilities / Specific sites (multi-select)",
            "Data completeness indicator: % of data approved for the selected period",
            "Section customization: toggle individual report sections on/off",
            "Preview panel: live PDF preview before download",
            "Download button: generates final PDF",
            "Share options: email recipient list, shareable link",
            "Report history: all previously generated reports with version numbers",
        ]),
    ]

    for scr_id, scr_name, elements in scr_list:
        story.append(Paragraph(f"{scr_id}: {scr_name}", s['subsec']))
        for elem in elements:
            story.append(Paragraph(f"&#x2022;  {elem}", s['bullet']))
        story.append(Spacer(1, 3*mm))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 18 — USER WORKFLOWS
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 18, "User Workflows")

    story += subsec_hdr(s, "18.1  Workflow 1: Monthly Environmental Data Submission")
    story.append(Paragraph("Actor: HSE Officer (Plant Level)  |  Trigger: Start of new month  |  Frequency: Monthly", s['body']))
    story.append(Spacer(1, 2*mm))
    wf1 = [
        ("Step 1",  "Login to EcoSphere → Navigate to Energy module → Select facility and reporting month"),
        ("Step 2",  "Enter grid electricity (kWh), diesel (litres), coal (MT), CNG (SCM), renewable energy (kWh)"),
        ("Step 3",  "Upload utility bills: electricity bill PDF + meter reading image"),
        ("Step 4",  "Navigate to Water module → Enter municipal, groundwater, recycled, effluent volumes"),
        ("Step 5",  "Upload water bills and ETP monitoring reports"),
        ("Step 6",  "Navigate to Waste module → Enter hazardous, non-hazardous, recycled, landfill quantities"),
        ("Step 7",  "Upload TSDF manifests and weighbridge slips for waste data"),
        ("Step 8",  "System auto-calculates GHG emissions using approved emission factors"),
        ("Step 9",  "Review calculated values against previous month (trend alert if >20% deviation)"),
        ("Step 10", "Click 'Submit for Review' → System sends notification to Plant/Facility Head"),
        ("Step 11", "Facility Head logs in → Reviews data → Approves or rejects with mandatory comments"),
        ("Step 12", "Sustainability Coordinator receives notification → Verifies evidence documents"),
        ("Step 13", "Sustainability Manager reviews cross-facility data → Provides final approval"),
        ("Step 14", "Data locked for reporting period → Available for automatic report population"),
    ]
    wf1_table = [[cell(a, bold=True, color=DARK_GREEN), cell(b)] for a, b in wf1]
    wf1_table.insert(0, hdr("Step", "Action"))
    story.append(make_table(wf1_table, [20*mm, 150*mm]))

    story.append(Spacer(1, 5*mm))
    story += subsec_hdr(s, "18.2  Workflow 2: Annual ESG Report Generation")
    story.append(Paragraph("Actor: Sustainability Manager + CSO  |  Trigger: End of reporting financial year  |  Frequency: Annual", s['body']))
    story.append(Spacer(1, 2*mm))
    wf2 = [
        ("Step 1",  "CSO initiates Annual Report in Reporting module → Selects FY and organizational scope"),
        ("Step 2",  "System checks data completeness → Flags modules / facilities with missing approvals"),
        ("Step 3",  "Sustainability Coordinator resolves all data gaps and completes pending approvals"),
        ("Step 4",  "System auto-populates all data sections from approved records in all modules"),
        ("Step 5",  "Materiality matrix auto-pulled from Materiality module with scores and ranking"),
        ("Step 6",  "Target progress auto-pulled from Targets module (RAG status auto-calculated)"),
        ("Step 7",  "Stakeholder engagement summary auto-pulled from Stakeholder module"),
        ("Step 8",  "GRI Content Index auto-generated with all applicable disclosures mapped"),
        ("Step 9",  "Draft report generated as PDF → Sustainability Manager reviews all sections"),
        ("Step 10", "CEO message entered or approved → Chairman/MD message entered"),
        ("Step 11", "Third-party assurance firm given read-only access to verified data set"),
        ("Step 12", "Assurance statement PDF uploaded by external auditor"),
        ("Step 13", "Final PDF generated with all sections, charts, images, and assurance statement"),
        ("Step 14", "Board review session → Board acknowledges via digital signature in platform"),
        ("Step 15", "Report published → Downloadable from platform, shared with stakeholders and website"),
    ]
    wf2_table = [[cell(a, bold=True, color=DARK_GREEN), cell(b)] for a, b in wf2]
    wf2_table.insert(0, hdr("Step", "Action"))
    story.append(make_table(wf2_table, [20*mm, 150*mm]))
    story.append(PageBreak())

    story += subsec_hdr(s, "18.3  Workflow 3: Supplier ESG Onboarding")
    story.append(Paragraph("Actor: Procurement Manager + Supplier Representative  |  Trigger: New supplier registration  |  Frequency: As required", s['body']))
    story.append(Spacer(1, 2*mm))
    wf3 = [
        ("Step 1",  "Procurement Manager creates supplier profile in Supply Chain module with basic details"),
        ("Step 2",  "System sends email invitation to supplier with secure portal registration link"),
        ("Step 3",  "Supplier registers on portal: company details, contact information, GST/PAN"),
        ("Step 4",  "Supplier reviews and digitally accepts the Supplier Code of Conduct (mandatory)"),
        ("Step 5",  "Supplier uploads ISO certificates, latest sustainability report, and emissions data"),
        ("Step 6",  "Supplier completes ESG questionnaire (environmental, social, governance sections)"),
        ("Step 7",  "System auto-calculates Supplier ESG Score (0–100) based on scoring matrix"),
        ("Step 8",  "Procurement Manager reviews supplier submission and scoring results"),
        ("Step 9",  "Risk classification assigned: High / Medium / Low based on score and category"),
        ("Step 10", "High-risk suppliers flagged → On-site ESG audit scheduled within 30 days"),
        ("Step 11", "Supplier profile activated → Available for procurement team decisions"),
        ("Step 12", "Annual re-assessment reminder sent automatically based on onboarding anniversary"),
    ]
    wf3_table = [[cell(a, bold=True, color=DARK_GREEN), cell(b)] for a, b in wf3]
    wf3_table.insert(0, hdr("Step", "Action"))
    story.append(make_table(wf3_table, [20*mm, 150*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 19 — NON-FUNCTIONAL REQUIREMENTS
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 19, "Non-Functional Requirements")

    nfr_data = [
        hdr("NFR ID", "Category", "Requirement", "Specification"),
        [cell("NFR-01",bold=True), cell("Performance"),   cell("Dashboard page load time"),  cell("< 3 seconds on standard broadband connection")],
        [cell("NFR-02",bold=True), cell("Performance"),   cell("Annual PDF report generation"),cell("< 30 seconds for full sustainability report")],
        [cell("NFR-03",bold=True), cell("Security"),      cell("Authentication"),             cell("Multi-factor authentication (MFA) mandatory for all users")],
        [cell("NFR-04",bold=True), cell("Security"),      cell("Data encryption"),            cell("AES-256 at rest; TLS 1.3 in transit")],
        [cell("NFR-05",bold=True), cell("Security"),      cell("Role-based access control"),  cell("RBAC with least-privilege principle; no default open access")],
        [cell("NFR-06",bold=True), cell("Availability"),  cell("Platform uptime SLA"),        cell("99.9% uptime SLA (< 8.76 hours unplanned downtime/year)")],
        [cell("NFR-07",bold=True), cell("Scalability"),   cell("Concurrent users"),           cell("Support 500+ simultaneous users without degradation")],
        [cell("NFR-08",bold=True), cell("Storage"),       cell("Evidence file storage"),      cell("Minimum 5 TB scalable cloud storage with expansion capability")],
        [cell("NFR-09",bold=True), cell("Audit Trail"),   cell("Activity logging"),           cell("Immutable audit log: all actions timestamped with user and result")],
        [cell("NFR-10",bold=True), cell("Retention"),     cell("Data retention policy"),      cell("7 years for all sustainability data and evidence files")],
        [cell("NFR-11",bold=True), cell("Compliance"),    cell("Data residency"),             cell("India data residency for DPDP Act 2023 compliance")],
        [cell("NFR-12",bold=True), cell("Accessibility"), cell("WCAG 2.1 standard"),         cell("AA level accessibility compliance for all screens")],
        [cell("NFR-13",bold=True), cell("Mobile"),        cell("Responsive design"),          cell("Mobile-friendly for field data entry (tablet / phone)")],
        [cell("NFR-14",bold=True), cell("Integration"),   cell("ERP system connectors"),      cell("SAP, Oracle, Tally integration-ready APIs for master data sync")],
        [cell("NFR-15",bold=True), cell("Backup"),        cell("Disaster recovery"),          cell("Daily backups; 4-hour RTO; 1-hour RPO for critical data")],
    ]
    story.append(make_table(nfr_data, [16*mm, 26*mm, 48*mm, 80*mm]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 20 — DOCUMENT CONTROL
    # ══════════════════════════════════════════════════════════════════════════
    story += section_header(s, 20, "Document Control")

    dc_data = [
        hdr("Version", "Date", "Author / Team", "Changes Made"),
        [cell("v0.1"), cell("January 2026"), cell("EcoSphere Platform Team"),  cell("Initial draft — core modules defined")],
        [cell("v0.2"), cell("March 2026"),   cell("Sustainability Team"),       cell("Added supplier sustainability module, scoring matrix")],
        [cell("v0.3"), cell("May 2026"),     cell("Governance Review Team"),    cell("Added governance workflows, approval hierarchy")],
        [cell("v1.0"), cell("June 2026"),    cell("CSO Office"),                cell("Final approved version — all 19 sections complete")],
    ]
    story.append(make_table(dc_data, [18*mm, 26*mm, 52*mm, 74*mm]))

    story.append(Spacer(1, 8*mm))
    sign_data = [
        [cell("Prepared by", bold=True, color=DARK_GREEN), cell("Reviewed by", bold=True, color=DARK_GREEN),
         cell("Approved by", bold=True, color=DARK_GREEN)],
        [cell("EcoSphere Platform Team"), cell("Sustainability Manager"), cell("Chief Sustainability Officer")],
        [cell(""), cell(""), cell("")],
        [cell("Signature: _______________"), cell("Signature: _______________"), cell("Signature: _______________")],
        [cell("Date: _______________"),     cell("Date: _______________"),       cell("Date: _______________")],
    ]
    sign_t = Table(sign_data, colWidths=[56*mm, 56*mm, 56*mm])
    sign_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GREEN),
        ('FONTNAME',   (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',   (0, 0), (-1, -1), 9),
        ('GRID',       (0, 0), (-1, -1), 0.5, GREY_MED),
        ('ALIGN',      (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GREY_LIGHT, WHITE, GREY_LIGHT]),
    ]))
    story.append(sign_t)

    story.append(Spacer(1, 10*mm))
    footer_style = ParagraphStyle("footer_note", fontSize=8, textColor=GREY_MED,
                                  alignment=TA_CENTER, fontName="Helvetica")
    story.append(HRFlowable(width="100%", thickness=1, color=GREY_MED, spaceAfter=4))
    story.append(Paragraph(
        "EcoSphere Enterprise Sustainability &amp; ESG Platform  |  FRS/BRD v1.0  |  June 2026  |  CONFIDENTIAL<br/>"
        "This document is prepared for internal use only. Unauthorized distribution is prohibited.<br/>"
        "Copyright &copy; 2026 EcoSphere. All Rights Reserved.", footer_style))

    # ── Build PDF ─────────────────────────────────────────────────────────────
    doc.build(story, canvasmaker=HeaderFooterCanvas)
    print(f"PDF successfully created: {OUTPUT_PATH}")


if __name__ == "__main__":
    build()
