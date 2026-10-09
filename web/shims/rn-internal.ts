// Some React Native libraries import internals such as
// `react-native/Libraries/Utilities/codegenNativeComponent`. Those only make
// sense on a phone, so on the web they get this empty stand-in.

const codegenNativeComponent = (name: string) => name;

export default codegenNativeComponent;
export const requireNativeComponent = (name: string) => name;
