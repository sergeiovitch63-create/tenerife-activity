#!/bin/bash

# Script de test direct de l'API Atlantico /payment/
# Utilise curl pour tester directement sans passer par notre proxy

echo "=========================================="
echo "Test direct API Atlantico /payment/"
echo "=========================================="
echo ""

# Configuration
BASE_URL="https://api.atlanticoexcursiones.com"
USER_ID="3645"
T_ID="509"
T_GROUP="55"
LANGUAGE="ENG"
TOUR_DATE="20260217"
SES_TIME=""  # Vide pour wdays_only
ADULTS="1"
CHILDS="0"
INFANTS="0"
NAME="Test User"
EMAIL="test@example.com"
PHONE="+1234567890"

echo "Test 1: Sans sesTime (wdays_only mode)"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/payment/" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
  -d "userId=${USER_ID}" \
  -d "t_id=${T_ID}" \
  -d "t_group=${T_GROUP}" \
  -d "language=${LANGUAGE}" \
  -d "tourDate=${TOUR_DATE}" \
  -d "adults=${ADULTS}" \
  -d "childs=${CHILDS}" \
  -d "infants=${INFANTS}" \
  -d "name=${NAME}" \
  -d "email=${EMAIL}" \
  -d "phone=${PHONE}" \
  -v

echo ""
echo ""
echo "Test 2: Avec sesTime=00:00"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/payment/" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
  -d "userId=${USER_ID}" \
  -d "t_id=${T_ID}" \
  -d "t_group=${T_GROUP}" \
  -d "language=${LANGUAGE}" \
  -d "tourDate=${TOUR_DATE}" \
  -d "sesTime=00:00" \
  -d "adults=${ADULTS}" \
  -d "childs=${CHILDS}" \
  -d "infants=${INFANTS}" \
  -d "name=${NAME}" \
  -d "email=${EMAIL}" \
  -d "phone=${PHONE}" \
  -v

echo ""
echo ""
echo "Test 3: Avec date au format YYYY-MM-DD"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/payment/" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \
  -d "userId=${USER_ID}" \
  -d "t_id=${T_ID}" \
  -d "t_group=${T_GROUP}" \
  -d "language=${LANGUAGE}" \
  -d "tourDate=2026-02-17" \
  -d "adults=${ADULTS}" \
  -d "childs=${CHILDS}" \
  -d "infants=${INFANTS}" \
  -d "name=${NAME}" \
  -d "email=${EMAIL}" \
  -d "phone=${PHONE}" \
  -v

echo ""
echo "=========================================="
echo "Tests terminés"
echo "=========================================="



