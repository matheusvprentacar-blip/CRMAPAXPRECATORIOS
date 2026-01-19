
export const normalizeDocument = (value: string) => {
    return value.replace(/\D/g, "");
};

export const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskCNPJ = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskPhone = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .replace(/(-\d{4})\d+?$/, "$1");
};

export const maskProcesso = (value: string) => {
    // Basic formatting for CNJ process number: NNNNNNN-DD.AAAA.J.TR.OOOO
    // 0000000-00.0000.0.00.0000
    return value
        .replace(/\D/g, "")
        .replace(/(\d{7})(\d)/, "$1-$2")
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{4})(\d)/, "$1.$2")
        .replace(/(\d{1})(\d)/, "$1.$2")
        .replace(/(\d{2})(\d)/, "$1.$2");
    // .replace(/(\d{4})\d+?$/, "$1"); // Removed strict limit
};
