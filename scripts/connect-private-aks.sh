#!/usr/bin/env bash
# Convenience: deploy a tiny Bastion-fronted jumpbox so participants can kubectl
# against the private AKS API server. Tears down with --destroy.
set -euo pipefail

SQUAD=${1:?usage: $0 <squad-id> [--destroy]}
ACTION=${2:-create}

cd "$(dirname "$0")/../infra/terraform/envs/squad-$SQUAD"
RG=$(terraform output -raw primary_resource_group)
LOC=$(terraform output -raw aks_primary_name | awk -F- '{print $5}')
VM=sita-jumpbox-${SQUAD}

if [ "$ACTION" = "--destroy" ]; then
  az vm delete -g $RG -n $VM -y
  exit 0
fi

az vm create -g $RG -n $VM --image Ubuntu2404 --size Standard_B2s \
  --admin-username azureuser --generate-ssh-keys \
  --subnet $(az network vnet list -g $RG --query "[0].subnets[?contains(name,'snet-aks-nodes')].id" -o tsv) \
  --public-ip-address ""
az vm extension set -g $RG --vm-name $VM --name CustomScript --publisher Microsoft.Azure.Extensions \
  --settings '{"commandToExecute":"curl -sSL https://get.docker.com | sh && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg && echo deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/azure-cli noble main > /etc/apt/sources.list.d/azure-cli.list && apt-get update && apt-get install -y azure-cli kubectl jq"}'
echo "Jumpbox $VM ready. Use: az network bastion ssh ..."
