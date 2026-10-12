from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.company import CompanyResponse, CompanyDetailResponse, RoleDefinition, SourceEvidence
from app.services.company_research_service import CompanyResearchService

router = APIRouter(prefix="/companies", tags=["Companies & Research"])

@router.get("", response_model=List[CompanyResponse])
async def list_companies():
    return await CompanyResearchService.get_all_companies()

@router.get("/{company_id}", response_model=CompanyDetailResponse)
async def get_company_detail(company_id: str):
    company = await CompanyResearchService.get_company_detail(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found."
        )
    return company

@router.get("/{company_id}/roles", response_model=List[RoleDefinition])
async def get_company_roles(company_id: str):
    company = await CompanyResearchService.get_company_detail(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found."
        )
    return company.get("roles", [])

@router.get("/{company_id}/evidence", response_model=List[SourceEvidence])
async def get_company_evidence(company_id: str):
    company = await CompanyResearchService.get_company_detail(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found."
        )
    return company.get("sources", [])
