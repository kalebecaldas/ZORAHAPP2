import React from 'react';
import { User, Phone, FileText, Heart, MapPin, Calendar, Clock, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PatientDataCardProps {
    data: {
        name?: string;
        phone: string;
        cpf?: string | null;
        email?: string | null;
        birthDate?: string | null;
        insuranceCompany?: string | null;
        insuranceNumber?: string | null;
        // Campos antigos (compatibilidade)
        convenio?: string;
        procedimento?: string;
        clinica?: string;
        data?: string;
        horario?: string;
    };
    timestamp: string;
}

export const PatientDataCard: React.FC<PatientDataCardProps> = ({ data, timestamp }) => {
    const [copiedField, setCopiedField] = React.useState<string | null>(null);

    const copyToClipboard = async (text: string | undefined, fieldName: string) => {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            toast.success(`${fieldName} copiado!`);

            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            toast.error('Erro ao copiar');
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const DataRow = ({
        icon: Icon,
        label,
        value,
        fieldName
    }: {
        icon: any;
        label: string;
        value?: string;
        fieldName: string;
    }) => {
        if (!value) return null;

        const isCopied = copiedField === fieldName;

        return (
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 flex-1">
                    <Icon className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                        <div className="text-xs text-gray-500">{label}</div>
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                    </div>
                </div>

                <button
                    onClick={() => copyToClipboard(value, label)}
                    className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={`Copiar ${label}`}
                >
                    {isCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                    ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="flex justify-center my-4">
            <div className="max-w-md w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            <h3 className="font-semibold">Dados Coletados</h3>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {formatTime(timestamp)}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-1 bg-white">
                    <DataRow
                        icon={User}
                        label="Nome"
                        value={data.name}
                        fieldName="Nome"
                    />

                    <DataRow
                        icon={Phone}
                        label="Telefone"
                        value={data.phone}
                        fieldName="Telefone"
                    />


                    {data.cpf && (
                        <DataRow
                            icon={FileText}
                            label="CPF"
                            value={data.cpf}
                            fieldName="CPF"
                        />
                    )}

                    {data.email && (
                        <DataRow
                            icon={FileText}
                            label="Email"
                            value={data.email}
                            fieldName="Email"
                        />
                    )}

                    {data.birthDate && (
                        <DataRow
                            icon={Calendar}
                            label="Data de Nascimento"
                            value={data.birthDate}
                            fieldName="Data de Nascimento"
                        />
                    )}

                    {(data.insuranceCompany || data.convenio) && (
                        <DataRow
                            icon={Heart}
                            label="Convênio"
                            value={data.insuranceCompany || data.convenio}
                            fieldName="Convênio"
                        />
                    )}

                    {data.insuranceNumber && (
                        <DataRow
                            icon={FileText}
                            label="Número da Carteirinha"
                            value={data.insuranceNumber}
                            fieldName="Carteirinha"
                        />
                    )}

                    {data.procedimento && (
                        <DataRow
                            icon={Heart}
                            label="Procedimento"
                            value={data.procedimento}
                            fieldName="Procedimento"
                        />
                    )}

                    {data.clinica && (
                        <DataRow
                            icon={MapPin}
                            label="Unidade"
                            value={data.clinica}
                            fieldName="Unidade"
                        />
                    )}

                    {data.data && (
                        <DataRow
                            icon={Calendar}
                            label="Data Desejada"
                            value={data.data}
                            fieldName="Data"
                        />
                    )}

                    {data.horario && (
                        <DataRow
                            icon={Clock}
                            label="Horário"
                            value={data.horario}
                            fieldName="Horário"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
                    <p className="text-xs text-center text-blue-700">
                        💡 Clique no ícone de copiar para usar os dados
                    </p>
                </div>
            </div>
        </div>
    );
};
