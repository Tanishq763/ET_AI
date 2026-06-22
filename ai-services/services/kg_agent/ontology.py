ONTOLOGY_LABELS = {
    "Document": ["id", "title", "docType", "plant", "uploadedAt", "summary", "kgNodeId"],
    "Equipment": ["tag", "equipmentClass", "description", "criticality", "plant", "status"],
    "Instrument": ["tag", "instrumentType", "range", "units", "location"],
    "Chemical": ["name", "casNumber", "hazardClass", "phase"],
    "Procedure": ["title", "revision", "docType", "plant", "effectiveDate"],
    "Regulation": ["code", "title", "body", "year", "jurisdiction"],
    "FailureMode": ["code", "description", "mechanism"],
    "WorkOrder": ["woNumber", "type", "priority", "status", "cost"],
    "Incident": ["incidentNumber", "type", "severity", "occurredAt"],
    "Person": ["name", "role", "department", "employeeId"],
    "Plant": ["plantId", "name", "location", "industry"],
    "Parameter": ["name", "value", "units", "measuredAt"],
    "MaintenanceActivity": ["activityType", "scheduledDate", "frequency"]
}

ONTOLOGY_RELATIONSHIPS = {
    "LOCATED_IN": ("Equipment", "Plant"),
    "APPEARS_IN": ("Equipment", "Document"),
    "GOVERNS": [("Regulation", "Equipment"), ("Regulation", "Procedure")],
    "REFERENCES": ("Document", "Equipment"),
    "SUPERSEDES": ("Document", "Document"),
    "FAILED_AS": ("WorkOrder", "FailureMode"),
    "CAUSED_BY": ("Incident", "FailureMode"),
    "APPLIED_TO": ("MaintenanceActivity", "Equipment"),
    "SIMILAR_TO": ("WorkOrder", "WorkOrder"),
    "COVERS": ("Procedure", "Equipment"),
    "COMPLIES_WITH": ("Document", "Regulation"),
    "PERFORMED_BY": ("WorkOrder", "Person"),
    "NEAR_MISS_FOR": ("Incident", "Equipment"),
    "HAS_PARAMETER": ("Equipment", "Parameter")
}

def validate_node(label: str, properties: dict) -> dict:
    """Filters node properties to match standard ontology property schemas."""
    allowed_keys = ONTOLOGY_LABELS.get(label, [])
    if not allowed_keys:
        return properties
    return {k: v for k, v in properties.items() if k in allowed_keys}
