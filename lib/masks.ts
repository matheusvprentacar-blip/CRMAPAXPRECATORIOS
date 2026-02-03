
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
    // CNJ format: 0000000-00.0000.0.00.0000 (7-2-4-1-2-4)
    const digits = value.replace(/\D/g, "").slice(0, 20);
    const part1 = digits.slice(0, 7);
    const part2 = digits.slice(7, 9);
    const part3 = digits.slice(9, 13);
    const part4 = digits.slice(13, 14);
    const part5 = digits.slice(14, 16);
    const part6 = digits.slice(16, 20);

    let formatted = part1;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `.${part3}`;
    if (part4) formatted += `.${part4}`;
    if (part5) formatted += `.${part5}`;
    if (part6) formatted += `.${part6}`;
    return formatted;
};
