/**
 * @see http://en.wikipedia.org/wiki/Link_relation
 * @see http://www.iana.org/assignments/link-relations/link-relations.xhtml
 */
export class LinkRelation {
    static readonly Accepted = 'accepted';


    /**
     * Conveys an identifier for the link's context.
     * @see http://www.iana.org/go/rfc4287
     * @link Canonical
     * @link Alternate
     * @link Via
     * @link Self
     */
    static readonly Self = 'self';

    /**
     * Refers to a parent document in a hierarchy of documents.
     * @see http://www.iana.org/go/rfc8288
     */
    static readonly Up = 'up';

    /**
     * Refers to a resource that can be used to search through the link's context and related resources.
     * @see http://www.opensearch.org/Specifications/OpenSearch/1.1
     */
    static readonly Search = 'search';

    /**
     * Refers to an icon representing the link's context.
     * @see http://www.w3.org/TR/html5/links.html#link-type-icon
     */
    static readonly Icon = 'icon';

    /**
     *  The target IRI points to a resource where a submission form can be obtained.
     *  @see http://www.iana.org/go/rfc6861
     */
    static readonly CreateForm = 'create-form';

    /**
     *  The target IRI points to a resource where a submission form for editing associated resource can be obtained.
     *  @see http://www.iana.org/go/rfc6861
     */
    static readonly EditForm = 'edit-form';

    /**
     *  The target IRI points to a resource where a submission form for searching associated resource can be obtained.
     *  @see http://www.iana.org/go/rfc6861
     */
    static readonly SearchForm = 'search-form';

    /**
     * The target IRI points to a resource where a submission form for editing associated resource can be obtained.
     * @see http://www.iana.org/go/rfc6861
     */
    static readonly ApplyForm = 'apply-form';

    /**
     * The target IRI points to a resource where the submission form should be sent.
     * @see http://www.iana.org/go/rfc6861
     */
    static readonly Submit = 'submit';

    /**
     * Designates the preferred version of a resource (the IRI and its contents).
     * @see http://www.iana.org/go/rfc6596
     */
    static readonly Canonical = 'canonical';

    /**
     * Indicates a resource where payment is accepted.
     * @see http://www.iana.org/go/rfc8288
     */
    static readonly Payment = 'payment';

    /**
     * Points to a resource containing the version history for the context
     * @see http://www.iana.org/go/rfc5829
     */
    static readonly VersionHistory = 'version-history';

    /**
     * Refers to a substitute for this context.
     * @see http://www.w3.org/TR/html5/links.html#link-type-alternate
     * @link Canonical
     * @link Alternate
     * @link Via
     * @link Self
     */
    static readonly Alternate = 'alternate';

    /**
     * Identifying that a resource representation conforms to a certain profile, without affecting the
     * non-profile semantics of the resource representation.
     * @see https://tools.ietf.org/html/rfc6906
     */
    static readonly Profile = 'profile';

    /**
     * Refers to a resource containing the most recent item(s) in a collection of resources.
     * @see https://tools.ietf.org/html/rfc5005
     */
    static readonly Current = 'current';

    /**
     * Identifies a resource that represents the context's status.
     * @see https://tools.ietf.org/html/rfc8631
     */
    static readonly Status = 'status';

    /**
     * Refers to a list of patent disclosures made with respect to material for which 'disclosure' relation is specified.
     *
     * A set of disclosures for a job application step (for a job seeker) - these are not the value themselves
     * but a record that the disclosure was made (or is available to be made)
     * @see https://tools.ietf.org/html/rfc6579
     */
    static readonly Disclosure = 'disclosure';

    /**
     * Identifies a resource that is the source of the information in the link's context.
     * @see https://tools.ietf.org/html/rfc4287
     * @link Canonical
     * @link Alternate
     * @link Describes
     * @link Self
     */
    static readonly Via = 'via';

    /**
     * The relationship A 'describes' B asserts that resource A provides a description of resource B. There
     * are no constraints on the format or representation of either A or B, neither are there any further
     * constraints on either resource.
     * @see https://tools.ietf.org/html/rfc6892
     * @link Canonical
     * @link Alternate
     * @link Via
     * @link Self
     */
    static readonly Describes = 'describes';

    /**
     * Refers to a resource providing information about the link's context.
     * @see http://www.w3.org/TR/powder-dr/#assoc-linking
     * @link Canonical
     * @link Alternate
     * @link Via
     * @link Self
     */
    static readonly DescribedBy = 'describedby';
}
